using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace MediCore.DataAccess;

public interface ISqlConnectionFactory
{
    IDbConnection Create();
}

public sealed class SqlConnectionFactory(IConfiguration configuration) : ISqlConnectionFactory
{
    public IDbConnection Create()
    {
        var cs = configuration.GetConnectionString("MediCore")
            ?? throw new InvalidOperationException("ConnectionStrings:MediCore no configurada.");
        return new SqlConnection(cs);
    }
}
