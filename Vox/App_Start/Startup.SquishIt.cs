[assembly: WebActivator.PreApplicationStartMethod(typeof(JabbR.App_Start.StartupSquishIt), "Start")]

namespace JabbR.App_Start
{
    using SquishIt.Framework;
    using SquishIt.Less;

    public class StartupSquishIt
    {
        public static void Start()
        {
            Bundle.RegisterStylePreprocessor(new LessPreprocessor());
        }
    }
}