using DemoApp.Api.Services;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class TaskServiceTests
{
    private readonly TaskService _sut = new();

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
}
