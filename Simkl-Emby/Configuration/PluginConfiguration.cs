using System;
using MediaBrowser.Model.Serialization;
using MediaBrowser.Model.Plugins;
using System.Linq;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Controller.Entities;
using System.Collections.Generic;

namespace Simkl.Configuration
{
    /// <summary>
    /// Class needed to create a Plugin and configurate it
    /// </summary>
    public class PluginConfiguration : BasePluginConfiguration
    {
        // TODO: Delete this a couple weeks after the plugin has gotten updated, to avoid any erroneous upgrades from happening when they shouldn't, and to avoid accidentally writing new code that touches it.
        public UserConfig[] userConfigs { get; set; }
    }

    public class ConfigurationFactory : IUserConfigurationFactory
    {
        public IEnumerable<ConfigurationStore> GetConfigurations()
        {
            return new[]
            {
                new SimklConfigStore
                {
                     ConfigurationType = typeof(UserConfig),
                     Key = ConfigKey
                }
            };
        }

        public static string ConfigKey = "simkl";
    }

    public class SimklConfigStore : ConfigurationStore
    {
    }
}
