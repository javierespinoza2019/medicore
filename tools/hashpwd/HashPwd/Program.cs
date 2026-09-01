Console.WriteLine(BCrypt.Net.BCrypt.HashPassword(args.Length>0?args[0]:"Demo123!", workFactor:11));
