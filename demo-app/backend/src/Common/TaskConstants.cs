namespace DemoApp.Api.Common;

/// <summary>
/// Shared constants used across services and controllers.
/// </summary>
public static class TaskConstants
{
    /// <summary>ISO 8601 date format used for serialising and parsing due dates.</summary>
    public const string DueDateFormat = "yyyy-MM-dd";

    /// <summary>Conflict message returned when a task is already completed.</summary>
    public const string TaskAlreadyCompletedMessage = "Task is already marked as complete.";
}
