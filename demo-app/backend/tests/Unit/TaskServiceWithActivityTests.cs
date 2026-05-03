using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

/// <summary>
/// Tests verifying that TaskService records activity entries via IActivityService
/// when tasks are created or completed.
/// </summary>
public sealed class TaskServiceWithActivityTests
{
    private readonly Mock<IActivityService> _mockActivityService;
    private readonly TaskService _sut;

    public TaskServiceWithActivityTests()
    {
        _mockActivityService = new Mock<IActivityService>();
        _mockActivityService
            .Setup(s => s.RecordActivityAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new ActivityEntryDto { Id = "a1", TaskId = "t1", Description = "x", CreatedAt = "2024-01-01T00:00:00Z" });

        _sut = new TaskService(NullLogger<TaskService>.Instance, _mockActivityService.Object);
    }

    [Fact]
    public async Task CreateTaskAsync_ValidDto_RecordsTaskCreatedActivity()
    {
        var dto = new CreateTaskDto { Title = "Activity Test Task" };

        await _sut.CreateTaskAsync(dto);

        _mockActivityService.Verify(
            s => s.RecordActivityAsync(It.IsAny<string>(), "Task created"),
            Times.Once);
    }

    [Fact]
    public async Task CreateTaskAsync_ValidDto_DoesNotRecordActivityForOtherDescriptions()
    {
        var dto = new CreateTaskDto { Title = "Another Task" };

        await _sut.CreateTaskAsync(dto);

        _mockActivityService.Verify(
            s => s.RecordActivityAsync(It.IsAny<string>(), It.Is<string>(d => d != "Task created")),
            Times.Never);
    }

    [Fact]
    public async Task CompleteTaskAsync_PendingTask_RecordsTaskMarkedCompleteActivity()
    {
        // Task "2" is seeded as pending
        await _sut.CompleteTaskAsync("2");

        _mockActivityService.Verify(
            s => s.RecordActivityAsync("2", "Task marked complete"),
            Times.Once);
    }

    [Fact]
    public async Task CompleteTaskAsync_NonExistentTask_DoesNotRecordActivity()
    {
        await _sut.CompleteTaskAsync("nonexistent");

        _mockActivityService.Verify(
            s => s.RecordActivityAsync(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }
}
