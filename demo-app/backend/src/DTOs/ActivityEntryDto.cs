namespace DemoApp.Api.DTOs;

/// <summary>
/// Data transfer object representing a single activity entry for a task.
/// </summary>
public sealed class ActivityEntryDto
{
    /// <summary>Gets or sets the unique identifier for this activity entry.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the identifier of the task this entry belongs to.</summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>Gets or sets the human-readable label describing the activity event (e.g. 'Task created', 'Task marked complete', 'Comment added').</summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>Gets or sets the ISO 8601 UTC datetime string when the activity occurred.</summary>
    public string CreatedAt { get; set; } = string.Empty;
}
