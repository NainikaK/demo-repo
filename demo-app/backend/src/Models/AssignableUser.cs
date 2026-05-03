namespace DemoApp.Api.Models;

/// <summary>
/// Represents a user who can be assigned to a task.
/// </summary>
public class AssignableUser
{
    /// <summary>Gets or sets the unique identifier.</summary>
    public int Id { get; set; }

    /// <summary>Gets or sets the display name of the user.</summary>
    public string Name { get; set; } = string.Empty;
}
