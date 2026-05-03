using DemoApp.Api.DTOs;
using DemoApp.Api.Models;
using Microsoft.Extensions.Logging;

namespace DemoApp.Api.Services;

/// <summary>
/// In-memory implementation of <see cref="ICommentService"/>.
/// Task existence is the caller's responsibility — this service stores and retrieves comments only.
/// </summary>
public class CommentService : ICommentService
{
    private const string ActivityCommentAdded = "Comment added";

    private readonly List<Comment> _comments = [];
    private readonly object _lock = new();
    private readonly IActivityService _activityService;
    private readonly ILogger<CommentService> _logger;

    /// <summary>Initialises the service.</summary>
    /// <param name="activityService">The activity service for recording comment events.</param>
    /// <param name="logger">The logger instance.</param>
    public CommentService(IActivityService activityService, ILogger<CommentService> logger)
    {
        _activityService = activityService;
        _logger = logger;
    }

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
    public async Task<CommentDto> AddCommentAsync(string taskId, string text)
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

        _logger.LogInformation("Comment added to task {TaskId}.", taskId);
        await _activityService.RecordActivityAsync(taskId, ActivityCommentAdded);
        return MapToDto(comment);
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
