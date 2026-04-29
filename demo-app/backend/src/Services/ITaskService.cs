using DemoApp.Api.DTOs;
using TaskModel = DemoApp.Api.Models.Task;

namespace DemoApp.Api.Services;

/// <summary>
/// Defines the contract for task management operations.
/// </summary>
public interface ITaskService
{
    /// <summary>Returns all tasks.</summary>
    Task<IEnumerable<TaskModel>> GetAllTasksAsync();

    /// <summary>Returns a single task by ID, or null if not found.</summary>
    Task<TaskModel?> GetTaskByIdAsync(string id);

    /// <summary>Creates a new task from the provided DTO and returns the persisted task.</summary>
    /// <param name="dto">The data required to create the task.</param>
    /// <returns>The newly created task.</returns>
    Task<TaskModel> CreateTaskAsync(CreateTaskDto dto);
}
