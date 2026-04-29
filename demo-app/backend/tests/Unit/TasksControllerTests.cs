using DemoApp.Api.Controllers;
using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Moq;
using Xunit;
using TaskModel = DemoApp.Api.Models.Task;

namespace DemoApp.Tests.Unit;

public sealed class TasksControllerTests
{
    private readonly Mock<ITaskService> _mockService;
    private readonly TasksController _sut;

    public TasksControllerTests()
    {
        _mockService = new Mock<ITaskService>();
        _sut = new TasksController(_mockService.Object);

        var problemDetailsFactory = new Mock<ProblemDetailsFactory>();
        problemDetailsFactory
            .Setup(f => f.CreateValidationProblemDetails(
                It.IsAny<HttpContext>(),
                It.IsAny<ModelStateDictionary>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .Returns((HttpContext ctx, ModelStateDictionary msd, int? statusCode, string? title, string? type, string? detail, string? instance) =>
                new ValidationProblemDetails(msd)
                {
                    Status = statusCode ?? 400,
                });

        _sut.ProblemDetailsFactory = problemDetailsFactory.Object;

        // Set up a default HttpContext so ProblemDetailsFactory calls don't fail on null context
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    // ── GET /api/v1/tasks ────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllTasks_TasksExist_Returns200WithTaskList()
    {
        var tasks = new List<TaskModel>
        {
            new() { Id = "1", Title = "Task One", Description = "", Completed = false, CreatedAt = DateTime.UtcNow },
        };
        _mockService.Setup(s => s.GetAllTasksAsync()).ReturnsAsync(tasks);

        var result = await _sut.GetAllTasks();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
    }

    // ── GET /api/v1/tasks/{id} ───────────────────────────────────────────────

    [Fact]
    public async Task GetTaskById_ValidId_Returns200WithTask()
    {
        var task = new TaskModel { Id = "1", Title = "Task One", Description = "", Completed = false, CreatedAt = DateTime.UtcNow };
        _mockService.Setup(s => s.GetTaskByIdAsync("1")).ReturnsAsync(task);

        var result = await _sut.GetTaskById("1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
        var dto = Assert.IsType<TaskDto>(okResult.Value);
        Assert.Equal("1", dto.Id);
        Assert.Equal("Task One", dto.Title);
    }

    [Fact]
    public async Task GetTaskById_InvalidId_Returns404()
    {
        _mockService.Setup(s => s.GetTaskByIdAsync("999")).ReturnsAsync((TaskModel?)null);

        var result = await _sut.GetTaskById("999");

        Assert.IsType<NotFoundResult>(result);
    }

    // ── POST /api/v1/tasks ───────────────────────────────────────────────────

    [Fact]
    public async Task CreateTask_ValidDto_Returns201WithCreatedTask()
    {
        var dto = new CreateTaskDto { Title = "Brand New Task", Description = "Details", DueDate = "2025-09-01" };
        var createdTask = new TaskModel
        {
            Id = "4",
            Title = "Brand New Task",
            Description = "Details",
            DueDate = new DateOnly(2025, 9, 1),
            Completed = false,
            CreatedAt = DateTime.UtcNow,
        };
        _mockService.Setup(s => s.CreateTaskAsync(dto)).ReturnsAsync(createdTask);

        var result = await _sut.CreateTask(dto);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(201, createdResult.StatusCode);
        var taskDto = Assert.IsType<TaskDto>(createdResult.Value);
        Assert.Equal("4", taskDto.Id);
        Assert.Equal("Brand New Task", taskDto.Title);
        Assert.Equal("2025-09-01", taskDto.DueDate);
        Assert.False(taskDto.Completed);
    }

    [Fact]
    public async Task CreateTask_EmptyTitle_Returns400WithValidationProblem()
    {
        var dto = new CreateTaskDto { Title = "" };

        var result = await _sut.CreateTask(dto);

        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(400, objectResult.StatusCode);
        _mockService.Verify(s => s.CreateTaskAsync(It.IsAny<CreateTaskDto>()), Times.Never);
    }

    [Fact]
    public async Task CreateTask_WhitespaceTitle_Returns400WithValidationProblem()
    {
        var dto = new CreateTaskDto { Title = "   " };

        var result = await _sut.CreateTask(dto);

        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(400, objectResult.StatusCode);
        _mockService.Verify(s => s.CreateTaskAsync(It.IsAny<CreateTaskDto>()), Times.Never);
    }

    [Fact]
    public async Task CreateTask_NullDueDate_Returns201WithNullDueDateInResponse()
    {
        var dto = new CreateTaskDto { Title = "No Due Date Task", DueDate = null };
        var createdTask = new TaskModel
        {
            Id = "5",
            Title = "No Due Date Task",
            Description = "",
            DueDate = null,
            Completed = false,
            CreatedAt = DateTime.UtcNow,
        };
        _mockService.Setup(s => s.CreateTaskAsync(dto)).ReturnsAsync(createdTask);

        var result = await _sut.CreateTask(dto);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(201, createdResult.StatusCode);
        var taskDto = Assert.IsType<TaskDto>(createdResult.Value);
        Assert.Null(taskDto.DueDate);
    }

    [Fact]
    public async Task CreateTask_ValidDto_CreatedAtActionPointsToGetTaskById()
    {
        var dto = new CreateTaskDto { Title = "Route Check Task" };
        var createdTask = new TaskModel
        {
            Id = "6",
            Title = "Route Check Task",
            Description = "",
            Completed = false,
            CreatedAt = DateTime.UtcNow,
        };
        _mockService.Setup(s => s.CreateTaskAsync(dto)).ReturnsAsync(createdTask);

        var result = await _sut.CreateTask(dto);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(_sut.GetTaskById), createdResult.ActionName);
        Assert.Equal("6", createdResult.RouteValues!["id"]);
    }
}