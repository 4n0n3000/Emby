using System;
using System.Collections.Generic;
using System.IO;    // IPluginConfigurationPage
// using System.Reflection;    // IPluginConfigurationPage

using MediaBrowser.Common.Plugins;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Model.Serialization;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Drawing;

using Simkl.Configuration;

namespace Simkl
{
    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages, IHasThumbImage
    {
        public static string StaticId = "Simkl";
        public static string StaticName = "Simkl";

        // public override string Name { get { return "Simkl TV Tracker"; } }
        // https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-operator#expression-body-definition
        public override string Name => "Simkl TV Tracker";
        public override string Description => "Scrobble your watched Movies, TV Shows and Anime to Simkl and share your progress with friends!";

        public override Guid Id => new Guid("2ecd91d5-b14b-4b92-8eb9-52c098edfc87");

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer) : base(applicationPaths, xmlSerializer) {
            Instance = this;
        }

        public static Plugin Instance { get; private set; }

        /* IHasWebPages */

        public IEnumerable<PluginPageInfo> GetPages() => new[]   // As we use new T inside, we can make it an implicitly typed array
            {
                new PluginPageInfo
                {
                    Name = "simkl_admin",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.simkladmin.html"
                },
                new PluginPageInfo
                {
                    Name = "simkljs",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.simkl.js"
                },
                new PluginPageInfo
                {
                    Name = StaticName,
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.simkl.html",
                    EnableInUserMenu = true,
                    //EnableInMainMenu = true,
                    FeatureId = StaticId
                },
                new PluginPageInfo
                {
                    Name = "simkladminjs",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.simkladmin.js"
                }
            };

        public PluginConfiguration PluginConfiguration => Configuration;

        public ImageFormat ThumbImageFormat {
            get {return ImageFormat.Jpg; }
        }

        public Stream GetThumbImage() {
            return GetType().Assembly.GetManifestResourceStream("Simkl.emby_thumb.jpg");
        }
    }
}
