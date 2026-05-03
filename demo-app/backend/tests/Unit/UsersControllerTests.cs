using DemoApp.Api.Controllers;
using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class UsersControllerTests
{
    private readonly Mock<IUserService> _mockService;
    private readonly UsersController _sut;

    public UsersControllerTests()
    {
        _mockService = new Mock<IUserService>();
        _sut = new UsersController(_mockService.Object, NullLogger<UsersController>.Instance);
    }

    [Fact]
    public async Task GetAllUsers_ServiceReturnsUsers_Returns200WithUsersPayload()
    {
        var users = new List<UserDto>
        {
            new() { Id = 1, Name = "Nainika K" },
            new() { Id = 2, Name = "Anna" },
            new() { Id = 3, Name = "Elsa" },
            new() { Id = 4, Name = "Sam D" },
            new() { Id = 5, Name = "Jacey" },
        };
        _mockService.Setup(s => s.GetAllUsersAsync()).ReturnsAsync(users);

        var result = await _sut.GetAllUsers();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
    }

    [Fact]
    public async Task GetAllUsers_ServiceThrows_Returns500()
    {
        _mockService
            .Setup(s => s.GetAllUsersAsync())
            .ThrowsAsync(new InvalidOperationException("Storage failure"));

        var result = await _sut.GetAllUsers();

        var statusResult = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
    }
}
