using DemoApp.Api.DTOs;

namespace DemoApp.Api.Services;

/// <summary>
/// Discriminated-union result for the complete-task operation.
/// </summary>
public abstract record CompleteTaskResult
{
    /// <summary>The task was not found.</summary>
    public sealed record NotFound : CompleteTaskResult;

    /// <summary>The task was already completed.</summary>
    public sealed record AlreadyCompleted : CompleteTaskResult;

    /// <summary>The task was successfully completed.</summary>
    /// <param name="Task">The updated task DTO.</param>
    public sealed record Success(TaskDto Task) : CompleteTaskResult;
}

/// <summary>
/// Discriminated-union result for the update-task-priority operation.
/// </summary>
public abstract record UpdateTaskPriorityResult
{
    /// <summary>The task was not found.</summary>
    public sealed record NotFound : UpdateTaskPriorityResult;

    /// <summary>The priority value supplied was invalid.</summary>
    public sealed record InvalidPriority : UpdateTaskPriorityResult;

    /// <summary>The priority was updated successfully.</summary>
    /// <param name="Task">The updated task DTO.</param>
    public sealed record Success(TaskDto Task) : UpdateTaskPriorityResult;
}

/// <summary>
/// Defines operations for managing tasks.
/// </summary>
public interface ITaskService
{
    /// <summary>Returns all tasks as DTOs.</summary>
    Task<IEnumerable<TaskDto>> GetAllTasksAsync();

    /// <summary>Returns a single task DTO by ID, or null if not found.</summary>
    /// <param name="id">The task identifier.</param>
    Task<TaskDto?> GetTaskByIdAsync(string id);

    /// <summary>Creates a new task from the provided DTO and returns the persisted task as a DTO.</summary>
    /// <param name="dto">The data required to create the task.</param>
    Task<TaskDto> CreateTaskAsync(CreateTaskDto dto);

    /// <summary>Marks an existing task as complete.</summary>
    /// <param name="id">The task identifier.</param>
    Task<CompleteTaskResult> CompleteTaskAsync(string id);

    /// <summary>Updates the priority of an existing task.</summary>
    /// <param name="id">The task identifier.</param>
    /// <param name="dto">The DTO containing the new priority value.</param>
    Task<UpdateTaskPriorityResult> UpdateTaskPriorityAsync(string id, UpdateTaskPriorityDto dto);
}
