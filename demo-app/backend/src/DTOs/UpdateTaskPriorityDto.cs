using System.ComponentModel.DataAnnotations;

namespace DemoApp.Api.DTOs;

/// <summary>
/// Data transfer object for updating the priority of an existing task.
/// </summary>
public class UpdateTaskPriorityDto
{
    /// <summary>
    /// Gets or sets the new priority value. Allowed values: low, medium, high.
    /// </summary>
    [Required]
    public string Priority { get; set; } = string.Empty;
}
