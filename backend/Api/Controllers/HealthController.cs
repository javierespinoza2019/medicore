using MediCore.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController(PlatformOptions platform) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public ActionResult<ApiResponse<object>> Get()
    {
        return Ok(ApiResponse<object>.Ok(new
        {
            status = "ok",
            product = "MediCore",
            phase = "0",
            environment = platform.EnvironmentName,
            isDemo = platform.IsDemo,
            allowRealPatientData = platform.AllowRealPatientData,
            dgisDestination = platform.DgisDestination,
            showEnvironmentBanner = platform.ShowEnvironmentBanner,
            utc = DateTimeOffset.UtcNow
        }));
    }
}
