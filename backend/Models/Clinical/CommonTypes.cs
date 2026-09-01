namespace MediCore.Models.Clinical;

/// <summary>
/// Tipos base transversales (M2 / doc 09 §14). Regla dura: ningún constructor por omisión
/// produce un valor clínico. Prohibido sustituir magnitudes con 0.
/// </summary>

/// <summary>Autoría de un acto (BM-TRA-04, BM-TRA-07). Se resuelve de la sesión; nunca de un literal.</summary>
public sealed record Autoria
{
    public Guid UserId { get; }
    public Guid? ProfessionalId { get; }
    public string DisplayName { get; }
    public string? ProfessionalLicense { get; }
    public DateTimeOffset OccurredAtUtc { get; }
    public DateTimeOffset RecordedAtUtc { get; }

    private Autoria(
        Guid userId,
        Guid? professionalId,
        string displayName,
        string? professionalLicense,
        DateTimeOffset occurredAtUtc,
        DateTimeOffset recordedAtUtc)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId de autoría es obligatorio.", nameof(userId));
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("DisplayName de autoría es obligatorio; no se sustituye con un literal.", nameof(displayName));

        UserId = userId;
        ProfessionalId = professionalId;
        DisplayName = displayName.Trim();
        ProfessionalLicense = string.IsNullOrWhiteSpace(professionalLicense) ? null : professionalLicense.Trim();
        OccurredAtUtc = occurredAtUtc;
        RecordedAtUtc = recordedAtUtc;
    }

    public static Autoria Crear(
        Guid userId,
        string displayName,
        DateTimeOffset occurredAtUtc,
        DateTimeOffset recordedAtUtc,
        Guid? professionalId = null,
        string? professionalLicense = null) =>
        new(userId, professionalId, displayName, professionalLicense, occurredAtUtc, recordedAtUtc);
}

public enum SelloEstado
{
    Pendiente = 0,
    Sellado = 1
}

/// <summary>Firma criptográfica / sello (BM-TRA-05). SelloEstado ∈ { pendiente, sellado }.</summary>
public sealed record Firma
{
    public string Algoritmo { get; }
    public string ContentHash { get; }
    public DateTimeOffset FirmadoAtUtc { get; }
    public DateTimeOffset? SelloAtUtc { get; }
    public SelloEstado SelloEstado { get; }

    private Firma(
        string algoritmo,
        string contentHash,
        DateTimeOffset firmadoAtUtc,
        DateTimeOffset? selloAtUtc,
        SelloEstado selloEstado)
    {
        if (string.IsNullOrWhiteSpace(algoritmo))
            throw new ArgumentException("Algoritmo de firma obligatorio.", nameof(algoritmo));
        if (string.IsNullOrWhiteSpace(contentHash))
            throw new ArgumentException("ContentHash obligatorio.", nameof(contentHash));
        if (selloEstado == SelloEstado.Sellado && selloAtUtc is null)
            throw new ArgumentException("Firma sellada exige SelloAtUtc.", nameof(selloAtUtc));
        if (selloEstado == SelloEstado.Pendiente && selloAtUtc is not null)
            throw new ArgumentException("Firma pendiente no lleva SelloAtUtc.", nameof(selloAtUtc));

        Algoritmo = algoritmo.Trim();
        ContentHash = contentHash.Trim();
        FirmadoAtUtc = firmadoAtUtc;
        SelloAtUtc = selloAtUtc;
        SelloEstado = selloEstado;
    }

    public static Firma Pendiente(string algoritmo, string contentHash, DateTimeOffset firmadoAtUtc) =>
        new(algoritmo, contentHash, firmadoAtUtc, null, SelloEstado.Pendiente);

    public static Firma Sellada(
        string algoritmo,
        string contentHash,
        DateTimeOffset firmadoAtUtc,
        DateTimeOffset selloAtUtc) =>
        new(algoritmo, contentHash, firmadoAtUtc, selloAtUtc, SelloEstado.Sellado);

    /// <summary>
    /// Hash SHA-256 hex en minúsculas del contenido UTF-8. Determinista: el mismo
    /// payload produce siempre el mismo ContentHash (base de SC-06).
    /// </summary>
    public static string HashContenidoSha256(string contenidoUtf8)
    {
        ArgumentNullException.ThrowIfNull(contenidoUtf8);
        var bytes = System.Text.Encoding.UTF8.GetBytes(contenidoUtf8);
        var hash = System.Security.Cryptography.SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public enum EstadoMedicion
{
    Medido = 0,
    NoMedido = 1,
    NoValorable = 2
}

public enum OrigenMedicion
{
    Medido = 0,
    Estimado = 1,
    Declarado = 2
}

/// <summary>
/// Medición con unidad y estado explícitos (BM-TRA-09). Sin valor exige Estado explícito.
/// No hay constructor vacío que invente 0.
/// </summary>
public sealed record Medicion<TUnidad> where TUnidad : notnull
{
    public decimal? Valor { get; }
    public TUnidad Unidad { get; }
    public EstadoMedicion Estado { get; }
    public OrigenMedicion Origen { get; }
    public string? RazonNoMedido { get; }

    private Medicion(
        decimal? valor,
        TUnidad unidad,
        EstadoMedicion estado,
        OrigenMedicion origen,
        string? razonNoMedido)
    {
        ArgumentNullException.ThrowIfNull(unidad);

        switch (estado)
        {
            case EstadoMedicion.Medido:
                if (valor is null)
                    throw new ArgumentException("Medición en estado medido exige Valor.", nameof(valor));
                if (!string.IsNullOrWhiteSpace(razonNoMedido))
                    throw new ArgumentException("Medición medida no lleva RazonNoMedido.", nameof(razonNoMedido));
                break;
            case EstadoMedicion.NoMedido:
            case EstadoMedicion.NoValorable:
                if (valor is not null)
                    throw new ArgumentException("Medición sin medir no admite Valor (no fabricar magnitud).", nameof(valor));
                if (string.IsNullOrWhiteSpace(razonNoMedido))
                    throw new ArgumentException("Medición sin valor exige RazonNoMedido explícita.", nameof(razonNoMedido));
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(estado), estado, "Estado de medición no reconocido.");
        }

        Valor = valor;
        Unidad = unidad;
        Estado = estado;
        Origen = origen;
        RazonNoMedido = string.IsNullOrWhiteSpace(razonNoMedido) ? null : razonNoMedido.Trim();
    }

    public static Medicion<TUnidad> Medida(decimal valor, TUnidad unidad, OrigenMedicion origen = OrigenMedicion.Medido) =>
        new(valor, unidad, EstadoMedicion.Medido, origen, null);

    public static Medicion<TUnidad> NoMedida(TUnidad unidad, string razon, OrigenMedicion origen = OrigenMedicion.Medido) =>
        new(null, unidad, EstadoMedicion.NoMedido, origen, razon);

    public static Medicion<TUnidad> NoValorable(TUnidad unidad, string razon, OrigenMedicion origen = OrigenMedicion.Medido) =>
        new(null, unidad, EstadoMedicion.NoValorable, origen, razon);
}

public enum EstadoInterrogatorioCodigo
{
    NoInterrogado = 0,
    SeDesconoce = 1,
    NoAplica = 2,
    Conocido = 3
}

/// <summary>
/// Estado de interrogatorio (BM-PAC-01). no_interrogado no colapsa con lista vacía ni con «negado».
/// </summary>
public sealed record EstadoInterrogatorio<T>
{
    public EstadoInterrogatorioCodigo Estado { get; }
    public T? Valor { get; }

    private EstadoInterrogatorio(EstadoInterrogatorioCodigo estado, T? valor)
    {
        if (estado == EstadoInterrogatorioCodigo.Conocido && valor is null)
            throw new ArgumentException("Estado conocido exige Valor.", nameof(valor));
        if (estado != EstadoInterrogatorioCodigo.Conocido && valor is not null)
            throw new ArgumentException("Sólo el estado conocido admite Valor.", nameof(valor));

        Estado = estado;
        Valor = valor;
    }

    public static EstadoInterrogatorio<T> NoInterrogado() =>
        new(EstadoInterrogatorioCodigo.NoInterrogado, default);

    public static EstadoInterrogatorio<T> SeDesconoce() =>
        new(EstadoInterrogatorioCodigo.SeDesconoce, default);

    public static EstadoInterrogatorio<T> NoAplica() =>
        new(EstadoInterrogatorioCodigo.NoAplica, default);

    public static EstadoInterrogatorio<T> Conocido(T valor)
    {
        if (valor is null)
            throw new ArgumentNullException(nameof(valor), "Valor conocido no puede ser nulo; use SeDesconoce o NoInterrogado.");
        return new(EstadoInterrogatorioCodigo.Conocido, valor);
    }
}

public enum UnidadEdad
{
    Anios = 0,
    Meses = 1,
    Dias = 2
}

public enum OrigenEdad
{
    Calculada = 0,
    Estimada = 1,
    Declarada = 2
}

/// <summary>Edad clínica con unidad y origen (doc 08 §5.2, BM-PAC-02). Sin omisión a 0 años.</summary>
public sealed record EdadEstimada
{
    public int Valor { get; }
    public UnidadEdad Unidad { get; }
    public int? RangoMin { get; }
    public int? RangoMax { get; }
    public OrigenEdad Origen { get; }

    private EdadEstimada(int valor, UnidadEdad unidad, int? rangoMin, int? rangoMax, OrigenEdad origen)
    {
        if (valor < 0)
            throw new ArgumentOutOfRangeException(nameof(valor), "La edad no puede ser negativa.");
        if (rangoMin is not null && rangoMax is not null && rangoMin > rangoMax)
            throw new ArgumentException("RangoMin no puede ser mayor que RangoMax.");

        Valor = valor;
        Unidad = unidad;
        RangoMin = rangoMin;
        RangoMax = rangoMax;
        Origen = origen;
    }

    public static EdadEstimada Crear(
        int valor,
        UnidadEdad unidad,
        OrigenEdad origen,
        int? rangoMin = null,
        int? rangoMax = null) =>
        new(valor, unidad, rangoMin, rangoMax, origen);
}

/// <summary>Importe monetario (BM-CAJ-05). decimal(18,4) + moneda; sin redondeo implícito a 0.</summary>
public sealed record Dinero
{
    public decimal Monto { get; }
    public string Moneda { get; }

    private Dinero(decimal monto, string moneda)
    {
        if (string.IsNullOrWhiteSpace(moneda))
            throw new ArgumentException("Moneda obligatoria.", nameof(moneda));
        // Escala máx. 4 decimales (espejo de decimal(18,4)).
        if (decimal.Round(monto, 4) != monto)
            throw new ArgumentException("Dinero admite como máximo 4 decimales.", nameof(monto));

        Monto = monto;
        Moneda = moneda.Trim().ToUpperInvariant();
    }

    public static Dinero Crear(decimal monto, string moneda) => new(monto, moneda);
}
