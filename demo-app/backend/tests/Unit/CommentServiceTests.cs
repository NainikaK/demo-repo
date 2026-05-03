using DemoApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class CommentServiceTests
{
    private readonly Mock<IActivityService> _mockActivityService;
    private readonly CommentService _sut;

    public CommentServiceTests()
    {
        _mockActivityService = new Mock<IActivityService>();
        _mockActivityService
            .Setup(s => s.RecordActivityAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new DemoApp.Api.DTOs.ActivityEntryDto
            {
                Id = "act-1",
                TaskId = "task-1",
                Description = "Comment added",
                CreatedAt = DateTime.UtcNow.ToString("o"),
            });
        _sut = new CommentService(_mockActivityService.Object, NullLogger<CommentService>.Instance);
    }

    [Fact]
    public async Task AddCommentAsync_ValidInput_ReturnsCommentDtoWithMatchingFields()
    {
        var result = await _sut.AddCommentAsync("task-1", "Hello world");

        Assert.NotNull(result);
        Assert.Equal("task-1", result.TaskId);
        Assert.Equal("Hello world", result.Text);
        Assert.False(string.IsNullOrWhiteSpace(result.Id));
    }

    [Fact]
    public async Task AddCommentAsync_ValidInput_RecordsActivityWithCommentAddedLabel()
    {
        await _sut.AddCommentAsync("task-1", "Test comment");

        _mockActivityService.Verify(
            s => s.RecordActivityAsync("task-1", "Comment added"),
            Times.Once);
    }

    [Fact]
    public async Task GetCommentsByTaskIdAsync_NoComments_ReturnsEmptyList()
    {
        var result = await _sut.GetCommentsByTaskIdAsync("task-none");

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCommentsByTaskIdAsync_AfterAddingComments_ReturnsCommentsForCorrectTask()
    {
        await _sut.AddCommentAsync("task-1", "First comment");
        await _sut.AddCommentAsync("task-1", "Second comment");
        await _sut.AddCommentAsync("task-2", "Other task comment");

        var result = await _sut.GetCommentsByTaskIdAsync("task-1");

        Assert.Equal(2, result.Count);
    }
}
