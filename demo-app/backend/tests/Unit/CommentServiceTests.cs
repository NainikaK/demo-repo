using DemoApp.Api.Services;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class CommentServiceTests
{
    private readonly CommentService _sut = new();

    // GetCommentsByTaskIdAsync

    [Fact]
    public async Task GetCommentsByTaskIdAsync_NoComments_ReturnsEmptyList()
    {
        var result = await _sut.GetCommentsByTaskIdAsync("task-1");

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCommentsByTaskIdAsync_UnknownTask_ReturnsEmptyList()
    {
        var result = await _sut.GetCommentsByTaskIdAsync("does-not-exist");

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCommentsByTaskIdAsync_AfterAddingComment_ReturnsComment()
    {
        await _sut.AddCommentAsync("task-1", "Hello");

        var result = await _sut.GetCommentsByTaskIdAsync("task-1");

        Assert.Single(result);
        Assert.Equal("Hello", result[0].Text);
        Assert.Equal("task-1", result[0].TaskId);
    }

    [Fact]
    public async Task GetCommentsByTaskIdAsync_OnlyReturnsCommentsForRequestedTask()
    {
        await _sut.AddCommentAsync("task-1", "For task 1");
        await _sut.AddCommentAsync("task-2", "For task 2");

        var result = await _sut.GetCommentsByTaskIdAsync("task-1");

        Assert.Single(result);
        Assert.Equal("For task 1", result[0].Text);
    }

    // AddCommentAsync

    [Fact]
    public async Task AddCommentAsync_ValidInput_ReturnsNewComment()
    {
        var result = await _sut.AddCommentAsync("task-1", "My comment");

        Assert.Equal("task-1", result.TaskId);
        Assert.Equal("My comment", result.Text);
        Assert.False(string.IsNullOrEmpty(result.Id));
    }

    [Fact]
    public async Task AddCommentAsync_AssignsUniqueIds()
    {
        var first = await _sut.AddCommentAsync("task-1", "First");
        var second = await _sut.AddCommentAsync("task-1", "Second");

        Assert.NotEqual(first.Id, second.Id);
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
        await _sut.AddCommentAsync("task-1", "First");
        await _sut.AddCommentAsync("task-1", "Second");

        var result = await _sut.GetCommentCountAsync("task-1");

        Assert.Equal(2, result);
    }

    [Fact]
    public async Task GetCommentCountAsync_DoesNotCountOtherTaskComments()
    {
        await _sut.AddCommentAsync("task-1", "Belongs to task-1");
        await _sut.AddCommentAsync("task-2", "Belongs to task-2");

        var result = await _sut.GetCommentCountAsync("task-1");

        Assert.Equal(1, result);
    }
}
