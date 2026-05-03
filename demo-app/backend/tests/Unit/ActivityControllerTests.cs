using DemoApp.Api.Controllers;
using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Http;
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
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public async Task GetActivity_TaskWithEntries_Returns200WithActivityList()
    {
        IReadOnlyList<ActivityEntryDto> entries = new List<ActivityEntryDto>
        {
            new() { Id = "a1", TaskId = "task-1", EventType = "Task created", CreatedAt = "2024-01-10T09:00:00.0000000Z" },
            new() { Id = "a2", TaskId = "task-1", EventType = "Comment added", CreatedAt = "2024-01-11T10:00:00.0000000Z" },
        };
        _mockActivityService
            .Setup(s => s.GetActivityByTaskIdAsync("task-1"))
            .ReturnsAsync(entries);

        var result = await _sut.GetActivity("task-1");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(200, okResult.StatusCode);
        var returnedEntries = Assert.IsAssignableFrom<IReadOnlyList<ActivityEntryDto>>(okResult.Value);
        Assert.Equal(2, returnedEntries.Count);
    }

    [Fact]
    public async Task GetActivity_TaskWithNoEntries_Returns200WithEmptyList()
    {
        IReadOnlyList<ActivityEntryDto> emptyEntries = new List<ActivityEntryDto>();
        _mockActivityService
            .Setup(s => s.GetActivityByTaskIdAsync("task-empty"))
            .ReturnsAsync(emptyEntries);

        var result = await _sut.GetActivity("task-empty");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(200, okResult.StatusCode);
        var returnedEntries = Assert.IsAssignableFrom<IReadOnlyList<ActivityEntryDto>>(okResult.Value);
        Assert.Empty(returnedEntries);
    }
}
