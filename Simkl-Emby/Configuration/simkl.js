define([
    "loading",
    "baseView",
    "emby-input",
    "emby-button",
    "emby-select",
    "emby-checkbox"
], function (loading, BaseView) {

    "use strict";

    // Configuration for Simkl OAuth and UI management
    const SimklConfig = {
        // OAuth tracking
        loginPollInterval: null,
        loginCountdownInterval: null,
        loginTimeoutSeconds: 900, // 15 minutes default

        // Start the OAuth login process
        startLoginProcess: function() {
            loading.show();

            // Update UI state
            document.querySelector('.loginButtonContainer').style.display = 'none';
            document.querySelector('.loggingIn').style.display = 'block';
            document.querySelector('.configOptionsContainer').style.display = 'none';

            // Request PIN code from API
            ApiClient.getJSON(ApiClient.getUrl("Simkl/oauth/pin"))
                .then(function(response) {
                    loading.hide();

                    if (response && response.user_code) {
                        // Show PIN code to user
                        const loginPin = document.querySelector('.loginPin');
                        if (loginPin) {
                            loginPin.textContent = response.user_code;
                        }

                        // Show instructions with verification URL
                        const loginText = document.querySelector('.loginText');
                        if (loginText) {
                            loginText.innerHTML =
                                'Please go to <a href="' + response.verification_url +
                                '" target="_blank">' + response.verification_url +
                                '</a> and enter the code shown below:';
                        }

                        // Setup countdown timer
                        SimklConfig.loginTimeoutSeconds = response.expires_in || 900;
                        const countdownElement = document.querySelector('.loginSecondsRemaining');
                        if (countdownElement) {
                            countdownElement.textContent = SimklConfig.loginTimeoutSeconds;
                        }

                        // Start the countdown and polling for authorization status
                        SimklConfig.startCountdown();
                        SimklConfig.pollAuthStatus(response.user_code);
                    } else {
                        SimklConfig.handleLoginError("Failed to get login PIN");
                    }
                })
                .catch(function(error) {
                    loading.hide();
                    SimklConfig.handleLoginError("Error starting login process: " + error.message);
                });
        },

        // Poll for auth status until user completes authorization or timeout
        pollAuthStatus: function(userCode) {
            // Clear any existing polling
            if (SimklConfig.loginPollInterval) {
                clearInterval(SimklConfig.loginPollInterval);
            }

            // Check status every 5 seconds
            SimklConfig.loginPollInterval = setInterval(function() {
                ApiClient.getJSON(ApiClient.getUrl("Simkl/oauth/pin/" + userCode))
                    .then(function(response) {
                        if (response && response.result === "OK") {
                            // Success! User has authorized
                            clearInterval(SimklConfig.loginPollInterval);
                            SimklConfig.stopCountdown();

                            const currentUserId = ApiClient.getCurrentUserId();

                            // Get existing config and update with new token
                            SimklConfig.fetchUserConfig(currentUserId).then(function(config) {
                                config.userToken = response.access_token;


                                // Save the updated config
                                SimklConfig.saveUserConfig(currentUserId, config).then(function() {
                                    // Update UI to show config options
                                    document.querySelector('.loggingIn').style.display = 'none';
                                    document.querySelector('.configOptionsContainer').style.display = 'block';

                                    // Fetch and display user profile info
                                    SimklConfig.fetchUserProfile(config.userToken);
                                });

                            });
                        }
                    })
                    .catch(function(error) {
                        console.error("Error checking authorization status:", error);
                    });
            }, 5000); // Poll every 5 seconds
        },

        // Start countdown timer for login process
        startCountdown: function() {
            // Clear any existing timer
            SimklConfig.stopCountdown();

            // Update countdown every second
            SimklConfig.loginCountdownInterval = setInterval(function() {
                SimklConfig.loginTimeoutSeconds--;

                const countdownElement = document.querySelector('.loginSecondsRemaining');
                if (countdownElement) {
                    countdownElement.textContent = SimklConfig.loginTimeoutSeconds;
                }

                // If time runs out, cancel the login process
                if (SimklConfig.loginTimeoutSeconds <= 0) {
                    SimklConfig.stopLoginProcess();
                }
            }, 1000);
        },

        // Stop countdown timer
        stopCountdown: function() {
            if (SimklConfig.loginCountdownInterval) {
                clearInterval(SimklConfig.loginCountdownInterval);
                SimklConfig.loginCountdownInterval = null;
            }
        },

        // Stop the login process
        stopLoginProcess: function() {
            // Clear timers
            if (SimklConfig.loginPollInterval) {
                clearInterval(SimklConfig.loginPollInterval);
                SimklConfig.loginPollInterval = null;
            }
            SimklConfig.stopCountdown();

            // Update UI
            document.querySelector('.loginButtonContainer').style.display = 'block';
            document.querySelector('.loggingIn').style.display = 'none';
            document.querySelector('.configOptionsContainer').style.display = 'none';
        },

        // Handle login errors
        handleLoginError: function(errorMessage) {
            console.error("Simkl login error:", errorMessage);

            // Display error message to user
            const loginText = document.querySelector('.loginText');
            if (loginText) {
                loginText.innerHTML = '<span style="color: red;">Error: ' + errorMessage + '</span>';
            }

            // Reset login process after a delay
            setTimeout(function() {
                SimklConfig.stopLoginProcess();
            }, 5000);
        },

        // Log user out
        logOut: function() {
            const currentUserId = ApiClient.getCurrentUserId();

            SimklConfig.fetchUserConfig(currentUserId).then(function(config) {
                // Clear authentication token
                config.userToken = '';

                // Save updated config
                SimklConfig.saveUserConfig(currentUserId, config).then(function() {
                    // Update UI to show login button
                    document.querySelector('.configOptionsContainer').style.display = 'none';
                    document.querySelector('.loginButtonContainer').style.display = 'block';
                });
            });
        },

        // Fetch user configuration from server
        fetchUserConfig: function(userId) {
            return ApiClient.getTypedUserSettings(userId, 'simkl')
                .catch(function() {
                    // Return default config if none exists
                    return {
                        scrobbleMovies: true,
                        scrobbleShows: true,
                        scr_pct: 70,
                        scr_w_pct: 5,
                        min_length: 5,
                        userToken: '',
                        scrobbleTimeout: 30
                    };
                });
        },

        // Save user configuration to server
        saveUserConfig: function(userId, config) {
            return ApiClient.updateTypedUserSettings(userId, 'simkl', config);
        },

        // Fetch and display user profile information
        fetchUserProfile: function() {
            loading.show();

            // First get the user's configuration to get the token
            const currentUserId = ApiClient.getCurrentUserId();
            SimklConfig.fetchUserConfig(currentUserId).then(function (config) {
                if (!config.userToken) {
                    console.error("No Simkl token available");
                    loading.hide();
                    return;
                }

                // Then call the API with the token
                ApiClient.getJSON(ApiClient.getUrl(`Simkl/user/settings?token=${config.userToken}`))
                    .then(function (userSettings) {
                        loading.hide();

                        if (userSettings && userSettings.user && userSettings.user.name) {
                            // Update the username in the UI
                            const usernameElement = document.querySelector('.simklName');
                            if (usernameElement) {
                                usernameElement.textContent = userSettings.user.name;
                            }

                            // Update the stored configuration as well
                            config.userName = userSettings.user.name;
                            SimklConfig.saveUserConfig(currentUserId, config);
                        }
                    })
                    .catch(function (error) {
                        loading.hide();
                        console.error("Failed to fetch Simkl user profile:", error);
                    });
            });
        },

        // Update UI with saved config
        updateUIFromConfig: function(config) {
            // Update checkboxes
            const moviesCheckbox = document.querySelector('.scrobbleMovies');
            if (moviesCheckbox) {
                moviesCheckbox.checked = config.scrobbleMovies !== false;
            }

            const showsCheckbox = document.querySelector('.scrobbleShows');
            if (showsCheckbox) {
                showsCheckbox.checked = config.scrobbleShows !== false;
            }

            // Update scrobble percentage field
            const scrPctInput = document.querySelector('.scr_pct');
            if (scrPctInput) {
                scrPctInput.value = config.scr_pct || 70;
            }
        }
    };

    // Main view class for Simkl configuration page
    function SimklView(view, params) {
        BaseView.apply(this, arguments);

        this.view = view;
        this.params = params;

        // Set up event listeners
        this.initEventListeners();

        // Initialize the page
        this.init();
    }

    SimklView.prototype = Object.create(BaseView.prototype);
    SimklView.prototype.constructor = SimklView;

    // Initialize event listeners
    SimklView.prototype.initEventListeners = function() {
        const view = this.view;

        // Form submission
        view.querySelector('form').addEventListener('submit', this.onSubmit.bind(this));

        // Login/logout buttons
        const loginButton = view.querySelector('.loginButtonContainer button.button-submit');
        if (loginButton) {
            loginButton.addEventListener('click', SimklConfig.startLoginProcess);
        }

        const cancelButton = view.querySelector('.loggingIn button.button-cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', SimklConfig.stopLoginProcess);
        }

        const logoutButton = view.querySelector('.configOptionsContainer button');
        if (logoutButton) {
            logoutButton.addEventListener('click', SimklConfig.logOut);
        }
    };

    // Initialize the page
    SimklView.prototype.init = function() {
        const currentUserId = ApiClient.getCurrentUserId();

        // Show loading indicator
        loading.show();

        // Get user config and update UI
        SimklConfig.fetchUserConfig(currentUserId)
            .then(function(config) {
                // Update UI based on login status
                if (config.userToken) {
                    // User is logged in - show config options
                    document.querySelector('.loginButtonContainer').style.display = 'none';
                    document.querySelector('.loggingIn').style.display = 'none';
                    document.querySelector('.configOptionsContainer').style.display = 'block';

                    // Fetch user profile and update UI
                    SimklConfig.fetchUserProfile(config.userToken);
                } else {
                    // User is not logged in - show login button
                    document.querySelector('.loginButtonContainer').style.display = 'block';
                    document.querySelector('.loggingIn').style.display = 'none';
                    document.querySelector('.configOptionsContainer').style.display = 'none';
                }

                // Update form fields with saved values
                SimklConfig.updateUIFromConfig(config);

                // Hide loading indicator
                loading.hide();
            })
            .catch(function(error) {
                console.error("Error initializing Simkl configuration page:", error);
                loading.hide();

                // Show login button as fallback
                document.querySelector('.loginButtonContainer').style.display = 'block';
                document.querySelector('.loggingIn').style.display = 'none';
                document.querySelector('.configOptionsContainer').style.display = 'none';
            });
    };

    // Handle form submission
    SimklView.prototype.onSubmit = function(e) {
        e.preventDefault();

        // Show loading indicator
        loading.show();

        const view = this.view;
        const currentUserId = ApiClient.getCurrentUserId();

        // Get current config
        SimklConfig.fetchUserConfig(currentUserId)
            .then(function(config) {
                // Update config with form values
                const moviesCheckbox = view.querySelector('.scrobbleMovies');
                if (moviesCheckbox) {
                    config.scrobbleMovies = moviesCheckbox.checked;
                }

                const showsCheckbox = view.querySelector('.scrobbleShows');
                if (showsCheckbox) {
                    config.scrobbleShows = showsCheckbox.checked;
                }

                const scrPctInput = view.querySelector('.scr_pct');
                if (scrPctInput) {
                    config.scr_pct = parseInt(scrPctInput.value) || 70;
                }

                // Save updated config
                return SimklConfig.saveUserConfig(currentUserId, config);
            })
            .then(function() {
                loading.hide();

                // Show success message
                require(['toast'], function(toast) {
                    toast("Simkl settings saved");
                });
            })
            .catch(function(error) {
                loading.hide();
                console.error("Error saving Simkl configuration:", error);

                // Show error message
                require(['toast'], function(toast) {
                    toast("Error saving Simkl settings");
                });
            });

        return false;
    };

    // Handle view resume
    SimklView.prototype.onResume = function(options) {
        BaseView.prototype.onResume.apply(this, arguments);

        if (options.refresh) {
            this.init();
        }
    };

    // Expose the SimklConfig object globally for use in HTML
    window.SimklConfig = SimklConfig;

    return SimklView;
});