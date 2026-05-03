using DemoApp.Api.DTOs;

namespace DemoApp.Api.Services;

/// <summary>
/// Defines operations for managing comments on tasks.
/// </summary>
public interface ICommentService
{
    /// <summary>
    /// Retrieves all comments for a given task, ordered oldest-first.
    /// </summary>
    /// <param name="taskId">The identifier of the task.</param>
    Task<IReadOnlyList<CommentDto>> GetCommentsByTaskIdAsync(string taskId);

    /// <summary>
    /// Adds a new comment to the specified task and returns the created comment.
    /// </summary>
    /// <param name="taskId">The identifier of the task.</param>
    /// <param name="text">The comment text.</param>
    Task<CommentDto> AddCommentAsync(string taskId, string text);

    /// <summary>
    /// Returns the number of comments for a given task.
    /// </summary>
    /// <param name="taskId">The identifier of the task.</param>
    Task<int> GetCommentCountAsync(string taskId);
}
