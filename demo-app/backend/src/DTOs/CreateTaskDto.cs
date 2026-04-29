using System.ComponentModel.DataAnnotations;

namespace DemoApp.Api.DTOs;

/// <summary>
/// Data transfer object for creating a new task.
/// </summary>
public class CreateTaskDto
{
    /// <summary>Gets or sets the task title. Required, non-whitespace, max 255 characters.</summary>
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    /// <summary>Gets or sets the optional task description.</summary>
    public string? Description { get; set; }

    /// <summary>Gets or sets the optional due date as an ISO 8601 date string (e.g. '2025-09-01'), or null.</summary>
    public string? DueDate { get; set; }
}
