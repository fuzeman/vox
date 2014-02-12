using System.Collections.Generic;
using System.IO;
using DotLiquid;
using System;
using System.Security.Cryptography;

namespace JabbR.Infrastructure
{
    public class TemplateHelper
    {
        private static readonly Dictionary<string, CompiledTemplate> Compiled = new Dictionary<string, CompiledTemplate>(); 

        public static void Compile(string path)
        {
            path = GetPath(path);

            // Ensure template exists in cache
            if (!Compiled.ContainsKey(path))
                Compiled[path] = new CompiledTemplate {Path = path};


            var t = Compiled[path];

            using (var stream = File.OpenRead(path))
            {
                var hash = GetHash(stream);

                if (t.Hash == hash)
                    return;

                stream.Position = 0;

                using (var reader = new StreamReader(stream))
                {
                    var content = reader.ReadToEnd();

                    t.Template = Template.Parse(content);
                    t.Hash = hash;
                }
            }
        }

        public static string Render(string path, object model = null)
        {
            path = GetPath(path);

            // Ensure we have the latest template compiled
            Compile(path);

            if (model == null)
                return Compiled[path].Template.Render();

            return Compiled[path].Template.Render(Hash.FromAnonymousObject(model));
        }

        private static string GetPath(string path)
        {
            if (Path.IsPathRooted(path))
                return path;

            if (!path.EndsWith(".liquid"))
                path += ".liquid";

            if(!path.StartsWith("Templates"))
                path = Path.Combine("Templates", path);

            return Path.GetFullPath(path);
        }

        private static string GetHash(Stream stream)
        {
            using (var md5 = MD5.Create())
            {
                return BitConverter.ToString(md5.ComputeHash(stream)).Replace("-", "").ToLower();
            }
        }
    }

    public class CompiledTemplate
    {
        public string Path { get; set; }
        public string Hash { get; set; }

        public Template Template { get; set; }
    }
}