using DemoApp.Api.DTOs;
using DemoApp.Api.Models;
using DemoApp.Api.Services;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class CommentServiceTests
{
    private readonly Mock<ITaskService> _mockTaskService;
    private readonly CommentService _sut;

    public CommentServiceTests()
    {
        _mockTaskService = new Mock<ITaskService>();
        _sut = new CommentService(_mockTaskService.Object);
    }

    private static TaskDto MakeTaskDto(string id = "task-1") => new()
    {
        Id = id,
        Title = "Test Task",
        Description = "",
        Completed = false,
        CreatedAt = DateTime.UtcNow,
        Priority = "medium",
    };

    // GetCommentsByTaskIdAsync

    [Fact]
    public async Task GetCommentsByTaskIdAsync_TaskExists_ReturnsEmptyList()
    {
        _mockTaskService.Setup(s => s.GetTaskById("task-1")).Returns(MakeTaskDto());

        var result = await _sut.GetCommentsByTaskIdAsync("task-1");

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCommentsByTaskIdAsync_TaskDoesNotExist_ReturnsNull()
    {
        _mockTaskService.Setup(s => s.GetTaskById("missing")).Returns((TaskDto?)null);

        var result = await _sut.GetCommentsByTaskIdAsync("missing");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetCommentsByTaskIdAsync_AfterAddingComment_ReturnsComment()
    {
        _mockTaskService.Setup(s => s.GetTaskById("task-1")).Returns(MakeTaskDto());
        await _sut.AddCommentAsync("task-1", "Hello");

        var result = await _sut.GetCommentsByTaskIdAsync("task-1");

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Hello", result[0].Text);
    }

    // AddCommentAsync

    [Fact]
    public async Task AddCommentAsync_TaskExists_ReturnsNewComment()
    {
        _mockTaskService.Setup(s => s.GetTaskById("task-1")).Returns(MakeTaskDto());

        var result = await _sut.AddCommentAsync("task-1", "My comment");

        Assert.NotNull(result);
        Assert.Equal("task-1", result.TaskId);
        Assert.Equal("My comment", result.Text);
        Assert.False(string.IsNullOrEmpty(result.Id));
    }

    [Fact]
    public async Task AddCommentAsync_TaskDoesNotExist_ReturnsNull()
    {
        _mockTaskService.Setup(s => s.GetTaskById("missing")).Returns((TaskDto?)null);

        var result = await _sut.AddCommentAsync("missing", "Some text");

        Assert.Null(result);
    }

    // GetCommentCountAsync

    [Fact]
    public async Task GetCommentCountAsync_NoComments_ReturnsZero()
    {
        var result = await _sut.GetCommentCountAsync("task-1");

        Assert.Equal(0, result);
    }

    [Fact]
    public async Task GetCommentCountAsync_AfterAddingTwoComments_ReturnsTwo()
    {
        _mockTaskService.Setup(s => s.GetTaskById("task-1")).Returns(MakeTaskDto());
        await _sut.AddCommentAsync("task-1", "First");
        await _sut.AddCommentAsync("task-1", "Second");

        var result = await _sut.GetCommentCountAsync("task-1");

        Assert.Equal(2, result);
    }
}
