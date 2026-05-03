namespace DemoApp.Api.Models;

/// <summary>
/// Represents a task in the task management system.
/// </summary>
public class Task
{
    /// <summary>Gets or sets the unique identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the task title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Gets or sets the task description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the optional due date.</summary>
    public DateOnly? DueDate { get; set; }

    /// <summary>Gets or sets whether the task is completed.</summary>
    public bool Completed { get; set; }

    /// <summary>Gets or sets the UTC creation timestamp.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Gets or sets the optional name of the user assigned to this task.</summary>
    public string? AssignedTo { get; set; }
}
