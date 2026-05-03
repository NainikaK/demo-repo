using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class TaskServiceTests
{
    private readonly TaskService _sut = new(NullLogger<TaskService>.Instance);

    [Fact]
    public async Task GetAllTasksAsync_ReturnsAllTasks_WhenTasksExist()
    {
        var tasks = await _sut.GetAllTasksAsync();

        Assert.NotEmpty(tasks);
        Assert.Equal(3, tasks.Count());
    }

    [Fact]
    public async Task GetTaskByIdAsync_ReturnsTask_WhenIdIsValid()
    {
        var task = await _sut.GetTaskByIdAsync("1");

        Assert.NotNull(task);
        Assert.Equal("1", task.Id);
        Assert.Equal("Set up project", task.Title);
        Assert.True(task.Completed);
    }

    [Fact]
    public async Task GetTaskByIdAsync_ReturnsNull_WhenIdNotFound()
    {
        var task = await _sut.GetTaskByIdAsync("nonexistent");

        Assert.Null(task);
    }

    [Fact]
    public async Task CreateTaskAsync_ValidDto_ReturnsPersistedTask()
    {
        var dto = new CreateTaskDto
        {
            Title = "New Task",
            Description = "A description",
            DueDate = "2025-09-01",
        };

        var task = await _sut.CreateTaskAsync(dto);

        Assert.NotNull(task);
        Assert.Equal("New Task", task.Title);
        Assert.Equal("A description", task.Description);
        Assert.Equal("2025-09-01", task.DueDate);
        Assert.False(task.Completed);
        Assert.NotEmpty(task.Id);
    }

    [Fact]
    public async Task CreateTaskAsync_ValidDto_TaskAppearsInGetAll()
    {
        var dto = new CreateTaskDto { Title = "Appended Task" };

        await _sut.CreateTaskAsync(dto);

        var all = await _sut.GetAllTasksAsync();
        Assert.Equal(4, all.Count());
        Assert.Contains(all, t => t.Title == "Appended Task");
    }

    [Fact]
    public async Task CreateTaskAsync_TitleWithWhitespace_TrimsTitleOnPersist()
    {
        var dto = new CreateTaskDto { Title = "  Padded Title  " };

        var task = await _sut.CreateTaskAsync(dto);

        Assert.Equal("Padded Title", task.Title);
    }

    [Fact]
    public async Task CreateTaskAsync_NullDescription_StoresEmptyString()
    {
        var dto = new CreateTaskDto { Title = "No Description", Description = null };

        var task = await _sut.CreateTaskAsync(dto);

        Assert.Equal(string.Empty, task.Description);
    }

    [Fact]
    public async Task CreateTaskAsync_NullDueDate_StoresNullDueDate()
    {
        var dto = new CreateTaskDto { Title = "No Due Date", DueDate = null };

        var task = await _sut.CreateTaskAsync(dto);

        Assert.Null(task.DueDate);
    }

    [Fact]
    public async Task CreateTaskAsync_InvalidDueDateFormat_StoresNullDueDate()
    {
        var dto = new CreateTaskDto { Title = "Bad Date", DueDate = "not-a-date" };

        var task = await _sut.CreateTaskAsync(dto);

        Assert.Null(task.DueDate);
    }

    [Fact]
    public async Task CreateTaskAsync_MultipleCreations_AssignsIncrementingIds()
    {
        var dto1 = new CreateTaskDto { Title = "Task A" };
        var dto2 = new CreateTaskDto { Title = "Task B" };

        var task1 = await _sut.CreateTaskAsync(dto1);
        var task2 = await _sut.CreateTaskAsync(dto2);

        Assert.NotEqual(task1.Id, task2.Id);
        Assert.Equal(int.Parse(task1.Id) + 1, int.Parse(task2.Id));
    }

    [Fact]
    public async Task CompleteTaskAsync_PendingTask_ReturnsSuccessWithCompletedTask()
    {
        var result = await _sut.CompleteTaskAsync("2");

        var success = Assert.IsType<CompleteTaskResult.Success>(result);
        Assert.True(success.Task.Completed);
        Assert.Equal("2", success.Task.Id);
    }

    [Fact]
    public async Task CompleteTaskAsync_PendingTask_PersistsCompletedState()
    {
        await _sut.CompleteTaskAsync("2");

        var task = await _sut.GetTaskByIdAsync("2");
        Assert.NotNull(task);
        Assert.True(task.Completed);
    }

    [Fact]
    public async Task CompleteTaskAsync_AlreadyCompletedTask_ReturnsAlreadyCompleted()
    {
        var result = await _sut.CompleteTaskAsync("1");

        Assert.IsType<CompleteTaskResult.AlreadyCompleted>(result);
    }

    [Fact]
    public async Task CompleteTaskAsync_NonExistentId_ReturnsNotFound()
    {
        var result = await _sut.CompleteTaskAsync("nonexistent");

        Assert.IsType<CompleteTaskResult.NotFound>(result);
    }
}
