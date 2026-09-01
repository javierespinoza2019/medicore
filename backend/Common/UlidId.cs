namespace MediCore.Common;

/// <summary>ULID-like id generator for client/server border (ADR-005).</summary>
public static class UlidId
{
    public static string New() => Ulid.NewUlid().ToString();
}

// Minimal ULID without external package for Fase 0 portability.
file static class Ulid
{
    private const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    public static string NewUlid()
    {
        Span<byte> randomness = stackalloc byte[10];
        Random.Shared.NextBytes(randomness);

        var ms = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        Span<char> chars = stackalloc char[26];

        // 48-bit timestamp
        chars[0] = Alphabet[(int)((ms >> 45) & 0x1F)];
        chars[1] = Alphabet[(int)((ms >> 40) & 0x1F)];
        chars[2] = Alphabet[(int)((ms >> 35) & 0x1F)];
        chars[3] = Alphabet[(int)((ms >> 30) & 0x1F)];
        chars[4] = Alphabet[(int)((ms >> 25) & 0x1F)];
        chars[5] = Alphabet[(int)((ms >> 20) & 0x1F)];
        chars[6] = Alphabet[(int)((ms >> 15) & 0x1F)];
        chars[7] = Alphabet[(int)((ms >> 10) & 0x1F)];
        chars[8] = Alphabet[(int)((ms >> 5) & 0x1F)];
        chars[9] = Alphabet[(int)(ms & 0x1F)];

        // 80-bit randomness into 16 Crockford chars
        var bitBuffer = 0;
        var bitCount = 0;
        var idx = 10;
        for (var i = 0; i < randomness.Length; i++)
        {
            bitBuffer = (bitBuffer << 8) | randomness[i];
            bitCount += 8;
            while (bitCount >= 5 && idx < 26)
            {
                chars[idx++] = Alphabet[(bitBuffer >> (bitCount - 5)) & 0x1F];
                bitCount -= 5;
            }
        }
        if (idx < 26 && bitCount > 0)
            chars[idx] = Alphabet[(bitBuffer << (5 - bitCount)) & 0x1F];

        return new string(chars);
    }
}
