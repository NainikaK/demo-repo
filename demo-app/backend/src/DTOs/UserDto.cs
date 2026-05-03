namespace DemoApp.Api.DTOs;

/// <summary>
/// Data transfer object for an assignable user.
/// </summary>
public class UserDto
{
    /// <summary>Gets or sets the unique identifier.</summary>
    public int Id { get; set; }

    /// <summary>Gets or sets the display name of the user.</summary>
    public string Name { get; set; } = string.Empty;
}
