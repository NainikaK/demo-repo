using DemoApp.Api.Controllers;
using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class ActivityControllerTests
{
    private readonly Mock<IActivityService> _mockActivityService;
    private readonly ActivityController _sut;

    public ActivityControllerTests()
    {
        _mockActivityService = new Mock<IActivityService>();
        _sut = new ActivityController(_mockActivityService.Object);
    }

    [Fact]
    public async Task GetActivity_TaskHasEntries_Returns200WithActivityList()
    {
        IReadOnlyList<ActivityEntryDto> entries = new List<ActivityEntryDto>
        {
            new() { Id = "a1", TaskId = "task-1", Description = "Task created", CreatedAt = "2024-01-01T00:00:00.0000000Z" },
            new() { Id = "a2", TaskId = "task-1", Description = "Comment added", CreatedAt = "2024-01-02T00:00:00.0000000Z" },
        };
        _mockActivityService
            .Setup(s => s.GetActivityByTaskIdAsync("task-1"))
            .ReturnsAsync(entries);

        var result = await _sut.GetActivity("task-1");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(200, okResult.StatusCode);
        var returned = Assert.IsAssignableFrom<IReadOnlyList<ActivityEntryDto>>(okResult.Value);
        Assert.Equal(2, returned.Count);
    }

    [Fact]
    public async Task GetActivity_TaskHasNoEntries_Returns200WithEmptyList()
    {
        IReadOnlyList<ActivityEntryDto> entries = new List<ActivityEntryDto>();
        _mockActivityService
            .Setup(s => s.GetActivityByTaskIdAsync("task-empty"))
            .ReturnsAsync(entries);

        var result = await _sut.GetActivity("task-empty");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(200, okResult.StatusCode);
        var returned = Assert.IsAssignableFrom<IReadOnlyList<ActivityEntryDto>>(okResult.Value);
        Assert.Empty(returned);
    }
}
