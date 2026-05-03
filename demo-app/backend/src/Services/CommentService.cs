using DemoApp.Api.DTOs;
using DemoApp.Api.Models;

namespace DemoApp.Api.Services;

/// <summary>
/// In-memory implementation of <see cref="ICommentService"/>.
/// Task existence is the caller's responsibility — this service stores and retrieves comments only.
/// </summary>
public class CommentService : ICommentService
{
    private readonly List<Comment> _comments = [];
    private readonly object _lock = new();

    /// <inheritdoc />
    public Task<IReadOnlyList<CommentDto>> GetCommentsByTaskIdAsync(string taskId)
    {
        IReadOnlyList<CommentDto> result;
        lock (_lock)
        {
            result = _comments
                .Where(c => c.TaskId == taskId)
                .OrderBy(c => c.CreatedAt)
                .Select(MapToDto)
                .ToList()
                .AsReadOnly();
        }

        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public Task<CommentDto> AddCommentAsync(string taskId, string text)
    {
        var comment = new Comment
        {
            Id = Guid.NewGuid().ToString(),
            TaskId = taskId,
            Text = text,
            CreatedAt = DateTime.UtcNow,
        };

        lock (_lock)
        {
            _comments.Add(comment);
        }

        return Task.FromResult(MapToDto(comment));
    }

    /// <inheritdoc />
    public Task<int> GetCommentCountAsync(string taskId)
    {
        int count;
        lock (_lock)
        {
            count = _comments.Count(c => c.TaskId == taskId);
        }

        return Task.FromResult(count);
    }

    private static CommentDto MapToDto(Comment comment) => new()
    {
        Id = comment.Id,
        TaskId = comment.TaskId,
        Text = comment.Text,
        CreatedAt = comment.CreatedAt,
    };
}
