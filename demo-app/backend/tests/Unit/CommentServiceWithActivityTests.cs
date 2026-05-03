using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

/// <summary>
/// Tests verifying that CommentService records activity entries via IActivityService
/// when comments are added.
/// </summary>
public sealed class CommentServiceWithActivityTests
{
    private readonly Mock<IActivityService> _mockActivityService;
    private readonly CommentService _sut;

    public CommentServiceWithActivityTests()
    {
        _mockActivityService = new Mock<IActivityService>();
        _mockActivityService
            .Setup(s => s.RecordActivityAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new ActivityEntryDto { Id = "a1", TaskId = "t1", Description = "Comment added", CreatedAt = "2024-01-01T00:00:00Z" });

        _sut = new CommentService(_mockActivityService.Object, NullLogger<CommentService>.Instance);
    }

    [Fact]
    public async Task AddCommentAsync_ValidInput_RecordsCommentAddedActivity()
    {
        await _sut.AddCommentAsync("task-1", "Hello");

        _mockActivityService.Verify(
            s => s.RecordActivityAsync("task-1", "Comment added"),
            Times.Once);
    }

    [Fact]
    public async Task AddCommentAsync_ValidInput_DoesNotRecordOtherActivityDescriptions()
    {
        await _sut.AddCommentAsync("task-1", "Hello");

        _mockActivityService.Verify(
            s => s.RecordActivityAsync(It.IsAny<string>(), It.Is<string>(d => d != "Comment added")),
            Times.Never);
    }
}
