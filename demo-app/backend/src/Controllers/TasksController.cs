using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using TaskModel = DemoApp.Api.Models.Task;

namespace DemoApp.Api.Controllers;

/// <summary>
/// Provides endpoints for managing tasks.
/// </summary>
[ApiController]
[Route("api/v1/tasks")]
public sealed class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    private const string DueDateFormat = "yyyy-MM-dd";

    /// <summary>Initialises the controller with the task service.</summary>
    /// <param name="taskService">The task service.</param>
    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    /// <summary>Returns all tasks.</summary>
    /// <returns>A list of all tasks.</returns>
    /// <response code="200">Tasks retrieved successfully.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TaskDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllTasks()
    {
        var tasks = await _taskService.GetAllTasksAsync();
        return Ok(tasks.Select(MapToDto));
    }

    /// <summary>Returns a single task by ID.</summary>
    /// <param name="id">The task identifier.</param>
    /// <returns>The task if found, or 404 if not.</returns>
    /// <response code="200">Task retrieved successfully.</response>
    /// <response code="404">No task found with the given ID.</response>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTaskById(string id)
    {
        var task = await _taskService.GetTaskByIdAsync(id);
        if (task is null)
        {
            return NotFound();
        }

        return Ok(MapToDto(task));
    }

    /// <summary>Creates a new task.</summary>
    /// <param name="dto">The data required to create the task.</param>
    /// <returns>The newly created task.</returns>
    /// <response code="201">Task created successfully.</response>
    /// <response code="400">Request body is invalid (e.g. missing or empty title).</response>
    [HttpPost]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            ModelState.AddModelError(nameof(dto.Title), "Title is required and must not be whitespace.");
            return ValidationProblem(ModelState);
        }

        var task = await _taskService.CreateTaskAsync(dto);
        var result = MapToDto(task);

        return CreatedAtAction(nameof(GetTaskById), new { id = result.Id }, result);
    }

    private static TaskDto MapToDto(TaskModel task) =>
        new()
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            DueDate = task.DueDate.HasValue
                ? task.DueDate.Value.ToString(DueDateFormat)
                : null,
            Completed = task.Completed,
            CreatedAt = task.CreatedAt,
        };
}
