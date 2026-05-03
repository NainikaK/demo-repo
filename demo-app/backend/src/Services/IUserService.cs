using DemoApp.Api.DTOs;

namespace DemoApp.Api.Services;

/// <summary>
/// Defines operations for retrieving assignable users.
/// </summary>
public interface IUserService
{
    /// <summary>Returns all assignable users as DTOs.</summary>
    /// <returns>A collection of <see cref="UserDto"/> instances.</returns>
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
}
