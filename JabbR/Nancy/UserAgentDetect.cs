using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace JabbR.Nancy
{
    public class UserAgentDetect
    {
        private static string[] smartphones = new string[] { "iphone", "ipad", "android" };

        public static bool IsSmartphone(string userAgent)
        {
            if(userAgent == null) return false;
            userAgent = userAgent.ToLower();

            return smartphones.Any(x => userAgent.Contains(x));
        }
    }
}