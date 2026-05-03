using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DemoApp.Api.Controllers;

/// <summary>
/// Provides endpoints for retrieving assignable users.
/// </summary>
[ApiController]
[Route("api/v1/users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    /// <summary>Initialises the controller with the user service.</summary>
    /// <param name="userService">The user service.</param>
    /// <param name="logger">The logger instance.</param>
    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    /// <summary>Returns all assignable users.</summary>
    /// <returns>A list of all assignable users.</returns>
    /// <response code="200">Users retrieved successfully.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(new { users });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in {Action}.", nameof(GetAllUsers));
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }
}
