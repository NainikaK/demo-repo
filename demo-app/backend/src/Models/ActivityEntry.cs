namespace DemoApp.Api.Models;

/// <summary>
/// Represents a system-generated activity event associated with a task.
/// </summary>
public sealed class ActivityEntry
{
    /// <summary>Gets or sets the unique identifier for this activity entry.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the identifier of the task this entry belongs to.</summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>Gets or sets the human-readable description of the activity.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the UTC timestamp when the activity occurred.</summary>
    public DateTime OccurredAt { get; set; }
}
