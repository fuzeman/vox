namespace JabbR.Services
{
    public class RazorEmailTemplateContentReader : FileEmailTemplateContentReader
    {
        public const string DefaultTemplateDirectory = "views/email";
        public const string DefaultFileExtension = ".cshtml";

        public RazorEmailTemplateContentReader()
            : base(DefaultTemplateDirectory, DefaultFileExtension)
        {

        }
    }
}