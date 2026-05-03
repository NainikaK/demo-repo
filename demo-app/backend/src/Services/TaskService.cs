using System.Globalization;
using DemoApp.Api.Common;
using DemoApp.Api.DTOs;
using DemoApp.Api.Models;
using Microsoft.Extensions.Logging;
using TaskModel = DemoApp.Api.Models.Task;

namespace DemoApp.Api.Services;

/// <summary>
/// In-memory implementation of <see cref="ITaskService"/>.
/// Seeded with sample tasks on construction; no database required.
/// Thread-safe via a dedicated lock object.
/// </summary>
public sealed class TaskService : ITaskService
{
    private const string PriorityLow = "low";
    private const string PriorityMedium = "medium";
    private const string PriorityHigh = "high";

    private readonly List<TaskModel> _tasks;
    private int _nextId;
    private readonly object _lock = new();
    private readonly ILogger<TaskService> _logger;

    /// <summary>Initialises the service and seeds sample tasks.</summary>
    /// <param name="logger">The logger instance.</param>
    public TaskService(ILogger<TaskService> logger)
    {
        _logger = logger;

        _tasks =
        [
            new TaskModel
            {
                Id = "1",
                Title = "Set up project",
                Description = "Initialise the repository and configure the pipeline.",
                Completed = true,
                CreatedAt = new DateTime(2024, 1, 10, 9, 0, 0, DateTimeKind.Utc),
                Priority = TaskPriority.Medium,
            },
            new TaskModel
            {
                Id = "2",
                Title = "Write unit tests",
                Description = "Cover all service methods with xUnit tests.",
                Completed = false,
                CreatedAt = new DateTime(2024, 1, 12, 10, 30, 0, DateTimeKind.Utc),
                Priority = TaskPriority.Medium,
            },
            new TaskModel
            {
                Id = "3",
                Title = "Deploy to staging",
                Description = "Push the build to the staging environment and verify.",
                Completed = false,
                CreatedAt = new DateTime(2024, 1, 15, 14, 0, 0, DateTimeKind.Utc),
                Priority = TaskPriority.Medium,
            },
        ];

        _nextId = _tasks.Count + 1;
    }

    /// <summary>Returns all tasks as DTOs.</summary>
    public Task<IEnumerable<TaskDto>> GetAllTasksAsync()
    {
        try
        {
            List<TaskModel> snapshot;
            lock (_lock)
            {
                snapshot = [.. _tasks];
            }

            _logger.LogDebug("Retrieving all tasks. Count: {Count}", snapshot.Count);
            return Task.FromResult<IEnumerable<TaskDto>>(snapshot.Select(MapToDto).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while retrieving all tasks.");
            throw;
        }
    }

    /// <summary>Returns a single task DTO by ID, or null if not found.</summary>
    /// <param name="id">The task identifier.</param>
    public Task<TaskDto?> GetTaskByIdAsync(string id)
    {
        try
        {
            TaskModel? task;
            lock (_lock)
            {
                task = _tasks.FirstOrDefault(t => t.Id == id);
            }

            _logger.LogDebug("GetTaskById: id={Id}, found={Found}", id, task is not null);
            return Task.FromResult(task is null ? null : MapToDto(task));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while retrieving task by id {Id}.", id);
            throw;
        }
    }

    /// <summary>Creates a new task from the provided DTO and returns the persisted task as a DTO.</summary>
    /// <param name="dto">The data required to create the task.</param>
    public Task<TaskDto> CreateTaskAsync(CreateTaskDto dto)
    {
        try
        {
            TaskModel task;
            lock (_lock)
            {
                var priority = ParsePriority(dto.Priority) ?? TaskPriority.Medium;
                task = new TaskModel
                {
                    Id = (_nextId++).ToString(),
                    Title = dto.Title.Trim(),
                    Description = dto.Description ?? string.Empty,
                    DueDate = ParseDueDate(dto.DueDate),
                    Completed = false,
                    CreatedAt = DateTime.UtcNow,
                    AssignedTo = string.IsNullOrWhiteSpace(dto.AssignedTo) ? null : dto.AssignedTo.Trim(),
                    Priority = priority,
                };
                _tasks.Add(task);
            }

            _logger.LogInformation("Task created with id {Id}.", task.Id);
            return Task.FromResult(MapToDto(task));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while creating a task.");
            throw;
        }
    }

    /// <summary>Marks an existing task as complete.</summary>
    /// <param name="id">The task identifier.</param>
    public Task<CompleteTaskResult> CompleteTaskAsync(string id)
    {
        try
        {
            lock (_lock)
            {
                var task = _tasks.FirstOrDefault(t => t.Id == id);

                if (task is null)
                {
                    _logger.LogWarning("CompleteTask: task {Id} not found.", id);
                    return Task.FromResult<CompleteTaskResult>(new CompleteTaskResult.NotFound());
                }

                if (task.Completed)
                {
                    _logger.LogWarning("CompleteTask: task {Id} is already completed.", id);
                    return Task.FromResult<CompleteTaskResult>(new CompleteTaskResult.AlreadyCompleted());
                }

                task.Completed = true;
                _logger.LogInformation("Task {Id} marked as complete.", id);
                return Task.FromResult<CompleteTaskResult>(new CompleteTaskResult.Success(MapToDto(task)));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while completing task {Id}.", id);
            throw;
        }
    }

    /// <summary>Updates the priority of an existing task.</summary>
    /// <param name="id">The task identifier.</param>
    /// <param name="dto">The DTO containing the new priority value.</param>
    public Task<UpdateTaskPriorityResult> UpdateTaskPriorityAsync(string id, UpdateTaskPriorityDto dto)
    {
        try
        {
            lock (_lock)
            {
                var task = _tasks.FirstOrDefault(t => t.Id == id);

                if (task is null)
                {
                    _logger.LogWarning("UpdateTaskPriority: task {Id} not found.", id);
                    return Task.FromResult<UpdateTaskPriorityResult>(new UpdateTaskPriorityResult.NotFound());
                }

                var priority = ParsePriority(dto.Priority);
                if (priority is null)
                {
                    _logger.LogWarning("UpdateTaskPriority: invalid priority value '{Priority}'.", dto.Priority);
                    return Task.FromResult<UpdateTaskPriorityResult>(new UpdateTaskPriorityResult.InvalidPriority());
                }

                task.Priority = priority.Value;
                _logger.LogInformation("Task {Id} priority updated to {Priority}.", id, priority);
                return Task.FromResult<UpdateTaskPriorityResult>(new UpdateTaskPriorityResult.Success(MapToDto(task)));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while updating priority for task {Id}.", id);
            throw;
        }
    }

    private static TaskDto MapToDto(TaskModel task) =>
        new()
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            DueDate = task.DueDate.HasValue
                ? task.DueDate.Value.ToString(TaskConstants.DueDateFormat)
                : null,
            Completed = task.Completed,
            CreatedAt = task.CreatedAt,
            AssignedTo = task.AssignedTo,
            Priority = PriorityToString(task.Priority),
        };

    private static string PriorityToString(TaskPriority priority) => priority switch
    {
        TaskPriority.Low => PriorityLow,
        TaskPriority.High => PriorityHigh,
        _ => PriorityMedium,
    };

    private static TaskPriority? ParsePriority(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToLowerInvariant() switch
        {
            PriorityLow => TaskPriority.Low,
            PriorityMedium => TaskPriority.Medium,
            PriorityHigh => TaskPriority.High,
            _ => null,
        };
    }

    private static DateOnly? ParseDueDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (DateOnly.TryParseExact(value, TaskConstants.DueDateFormat, null, DateTimeStyles.None, out var date))
        {
            return date;
        }

        return null;
    }
}
