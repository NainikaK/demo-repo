using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class UserServiceTests
{
    private readonly UserService _sut = new(NullLogger<UserService>.Instance);

    [Fact]
    public async Task GetAllUsersAsync_ReturnsExactlyFiveUsers()
    {
        var users = await _sut.GetAllUsersAsync();

        Assert.Equal(5, users.Count());
    }

    [Fact]
    public async Task GetAllUsersAsync_ContainsExpectedUserNames()
    {
        var users = await _sut.GetAllUsersAsync();
        var names = users.Select(u => u.Name).ToList();

        Assert.Contains("Nainika K", names);
        Assert.Contains("Anna", names);
        Assert.Contains("Elsa", names);
        Assert.Contains("Sam D", names);
        Assert.Contains("Jacey", names);
    }
}
