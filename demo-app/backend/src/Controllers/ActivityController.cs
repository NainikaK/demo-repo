using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DemoApp.Api.Controllers;

/// <summary>
/// Exposes activity feed endpoints for tasks.
/// </summary>
[ApiController]
[Route("api/v1/tasks")]
public sealed class ActivityController : ControllerBase
{
    private readonly IActivityService _activityService;

    /// <summary>Initialises the controller with required services.</summary>
    /// <param name="activityService">The activity service.</param>
    public ActivityController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    /// <summary>
    /// Returns all activity entries for the specified task in chronological order.
    /// </summary>
    /// <param name="taskId">The identifier of the task.</param>
    /// <returns>A list of activity entry DTOs.</returns>
    [HttpGet("{taskId}/activity")]
    [ProducesResponseType(typeof(IReadOnlyList<ActivityEntryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ActivityEntryDto>>> GetActivity(string taskId)
    {
        var entries = await _activityService.GetActivityByTaskIdAsync(taskId);
        return Ok(entries);
    }
}
