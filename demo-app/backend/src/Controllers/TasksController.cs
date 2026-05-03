using DemoApp.Api.Common;
using DemoApp.Api.DTOs;
using DemoApp.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DemoApp.Api.Controllers;

/// <summary>
/// Provides endpoints for managing tasks.
/// </summary>
[ApiController]
[Route("api/v1/tasks")]
public sealed class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly ILogger<TasksController> _logger;

    /// <summary>Initialises the controller with the task service.</summary>
    /// <param name="taskService">The task service.</param>
    /// <param name="logger">The logger instance.</param>
    public TasksController(ITaskService taskService, ILogger<TasksController> logger)
    {
        _taskService = taskService;
        _logger = logger;
    }

    /// <summary>Returns all tasks.</summary>
    /// <returns>A list of all tasks.</returns>
    /// <response code="200">Tasks retrieved successfully.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TaskDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllTasks()
    {
        try
        {
            var tasks = await _taskService.GetAllTasksAsync();
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in {Action}.", nameof(GetAllTasks));
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
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
        try
        {
            var task = await _taskService.GetTaskByIdAsync(id);
            if (task is null)
            {
                return NotFound();
            }

            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in {Action} for id {Id}.", nameof(GetTaskById), id);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
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
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                ModelState.AddModelError(nameof(dto.Title), "Title is required and must not be whitespace.");
                return ValidationProblem(ModelState);
            }

            var result = await _taskService.CreateTaskAsync(dto);

            return CreatedAtAction(nameof(GetTaskById), new { id = result.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in {Action}.", nameof(CreateTask));
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>Marks a task as complete.</summary>
    /// <param name="id">The task identifier.</param>
    /// <returns>The updated task with completed set to true, or 404 if not found, or 409 if already completed.</returns>
    /// <response code="200">Task marked as complete successfully.</response>
    /// <response code="404">No task found with the given ID.</response>
    /// <response code="409">Task is already marked as complete.</response>
    [HttpPatch("{id}/complete")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CompleteTask(string id)
    {
        try
        {
            var result = await _taskService.CompleteTaskAsync(id);

            return result switch
            {
                CompleteTaskResult.NotFound => NotFound(),
                CompleteTaskResult.AlreadyCompleted => Conflict(new { message = TaskConstants.TaskAlreadyCompletedMessage }),
                CompleteTaskResult.Success success => Ok(success.Task),
                _ => StatusCode(StatusCodes.Status500InternalServerError),
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in {Action} for id {Id}.", nameof(CompleteTask), id);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }
}
