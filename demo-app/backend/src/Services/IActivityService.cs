using DemoApp.Api.DTOs;

namespace DemoApp.Api.Services;

/// <summary>
/// Defines operations for recording and retrieving system-level activity entries.
/// </summary>
public interface IActivityService
{
    /// <summary>
    /// Retrieves all activity entries for the specified task, ordered chronologically.
    /// </summary>
    /// <param name="taskId">The identifier of the task.</param>
    /// <returns>A read-only list of activity entry DTOs.</returns>
    Task<IReadOnlyList<ActivityEntryDto>> GetActivityByTaskIdAsync(string taskId);

    /// <summary>
    /// Records a new system-level activity entry for the specified task.
    /// </summary>
    /// <param name="taskId">The identifier of the task.</param>
    /// <param name="description">The human-readable description of the activity.</param>
    /// <returns>The created activity entry DTO.</returns>
    Task<ActivityEntryDto> RecordActivityAsync(string taskId, string description);
}
