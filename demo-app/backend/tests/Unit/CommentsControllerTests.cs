using DemoApp.Api.Controllers;
using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class CommentsControllerTests
{
    private readonly Mock<ICommentService> _mockService;
    private readonly CommentsController _sut;

    public CommentsControllerTests()
    {
        _mockService = new Mock<ICommentService>();
        var mockLogger = new Mock<ILogger<CommentsController>>();
        _sut = new CommentsController(_mockService.Object, mockLogger.Object);
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    // GET /api/v1/tasks/{taskId}/comments

    [Fact]
    public async Task GetComments_TaskExists_Returns200WithCommentList()
    {
        var comments = new List<CommentDto>
        {
            new() { Id = "c1", TaskId = "task-1", Text = "Hello", CreatedAt = DateTime.UtcNow },
        };
        _mockService
            .Setup(s => s.GetCommentsByTaskIdAsync("task-1"))
            .ReturnsAsync(comments);

        var result = await _sut.GetComments("task-1");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(200, okResult.StatusCode);
    }

    [Fact]
    public async Task GetComments_TaskDoesNotExist_Returns404()
    {
        _mockService
            .Setup(s => s.GetCommentsByTaskIdAsync("missing"))
            .ReturnsAsync((IReadOnlyList<CommentDto>?)null);

        var result = await _sut.GetComments("missing");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetComments_ServiceThrows_Returns500()
    {
        _mockService
            .Setup(s => s.GetCommentsByTaskIdAsync("task-1"))
            .ThrowsAsync(new InvalidOperationException("Storage failure"));

        var result = await _sut.GetComments("task-1");

        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    // POST /api/v1/tasks/{taskId}/comments

    [Fact]
    public async Task CreateComment_ValidDto_Returns201WithCreatedComment()
    {
        var dto = new CreateCommentDto { Text = "A valid comment" };
        var created = new CommentDto
        {
            Id = "c2",
            TaskId = "task-1",
            Text = "A valid comment",
            CreatedAt = DateTime.UtcNow,
        };
        _mockService
            .Setup(s => s.AddCommentAsync("task-1", dto.Text))
            .ReturnsAsync(created);

        var result = await _sut.CreateComment("task-1", dto);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(201, createdResult.StatusCode);
        var commentDto = Assert.IsType<CommentDto>(createdResult.Value);
        Assert.Equal("c2", commentDto.Id);
        Assert.Equal("A valid comment", commentDto.Text);
    }

    [Fact]
    public async Task CreateComment_TaskDoesNotExist_Returns404()
    {
        var dto = new CreateCommentDto { Text = "Hello" };
        _mockService
            .Setup(s => s.AddCommentAsync("missing", dto.Text))
            .ReturnsAsync((CommentDto?)null);

        var result = await _sut.CreateComment("missing", dto);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task CreateComment_InvalidModelState_Returns400()
    {
        var dto = new CreateCommentDto { Text = "" };
        _sut.ModelState.AddModelError("Text", "The Text field is required.");

        var result = await _sut.CreateComment("task-1", dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(400, badRequest.StatusCode);
        _mockService.Verify(s => s.AddCommentAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateComment_ServiceThrows_Returns500()
    {
        var dto = new CreateCommentDto { Text = "Hello" };
        _mockService
            .Setup(s => s.AddCommentAsync("task-1", dto.Text))
            .ThrowsAsync(new InvalidOperationException("Unexpected"));

        var result = await _sut.CreateComment("task-1", dto);

        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
    }
}
