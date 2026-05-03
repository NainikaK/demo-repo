using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class TaskServiceActivityTests
{
    private readonly Mock<IActivityService> _mockActivityService;
    private readonly TaskService _sut;

    public TaskServiceActivityTests()
    {
        _mockActivityService = new Mock<IActivityService>();
        _mockActivityService
            .Setup(s => s.RecordActivityAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new ActivityEntryDto
            {
                Id = "act-1",
                TaskId = "task-id",
                Description = "Task created",
                CreatedAt = DateTime.UtcNow.ToString("o"),
            });
        _sut = new TaskService(NullLogger<TaskService>.Instance, _mockActivityService.Object);
    }

    [Fact]
    public async Task CreateTaskAsync_ValidDto_RecordsTaskCreatedActivity()
    {
        var dto = new CreateTaskDto { Title = "New Task", Priority = "medium" };

        var result = await _sut.CreateTaskAsync(dto);

        _mockActivityService.Verify(
            s => s.RecordActivityAsync(result.Id, "Task created"),
            Times.Once);
    }

    [Fact]
    public async Task CreateTaskAsync_ValidDto_ReturnsCreatedTaskDto()
    {
        var dto = new CreateTaskDto { Title = "Another Task", Priority = "high" };

        var result = await _sut.CreateTaskAsync(dto);

        Assert.NotNull(result);
        Assert.Equal("Another Task", result.Title);
        Assert.False(result.Completed);
    }

    [Fact]
    public async Task CompleteTaskAsync_ExistingPendingTask_RecordsTaskMarkedCompleteActivity()
    {
        // Use a seeded task id (id "2" is pending in the seeded data)
        var taskResult = await _sut.CompleteTaskAsync("2");

        var success = Assert.IsType<CompleteTaskResult.Success>(taskResult);
        _mockActivityService.Verify(
            s => s.RecordActivityAsync("2", "Task marked complete"),
            Times.Once);
    }

    [Fact]
    public async Task CompleteTaskAsync_NonExistentTask_DoesNotRecordActivity()
    {
        await _sut.CompleteTaskAsync("nonexistent-id");

        _mockActivityService.Verify(
            s => s.RecordActivityAsync(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }
}
