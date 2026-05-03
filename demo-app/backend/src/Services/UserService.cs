using DemoApp.Api.DTOs;
using DemoApp.Api.Models;
using Microsoft.Extensions.Logging;

namespace DemoApp.Api.Services;

/// <summary>
/// In-memory implementation of <see cref="IUserService"/>.
/// Seeded with the five assignable users; no database required.
/// </summary>
public sealed class UserService : IUserService
{
    private readonly IReadOnlyList<UserDto> _users;
    private readonly ILogger<UserService> _logger;

    /// <summary>Initialises the service and seeds the assignable users.</summary>
    /// <param name="logger">The logger instance.</param>
    public UserService(ILogger<UserService> logger)
    {
        _logger = logger;

        _users =
        [
            new UserDto { Id = 1, Name = "Nainika K" },
            new UserDto { Id = 2, Name = "Anna" },
            new UserDto { Id = 3, Name = "Elsa" },
            new UserDto { Id = 4, Name = "Sam D" },
            new UserDto { Id = 5, Name = "Jacey" },
        ];
    }

    /// <summary>Returns all assignable users as DTOs.</summary>
    /// <returns>A collection of <see cref="UserDto"/> instances.</returns>
    public Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        _logger.LogDebug("Retrieving all assignable users. Count: {Count}", _users.Count);
        return Task.FromResult<IEnumerable<UserDto>>(_users);
    }
}
