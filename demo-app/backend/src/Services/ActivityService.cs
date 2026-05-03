using DemoApp.Api.DTOs;
using DemoApp.Api.Models;
using Microsoft.Extensions.Logging;

namespace DemoApp.Api.Services;

/// <summary>
/// In-memory implementation of <see cref="IActivityService"/>.
/// Stores and retrieves system-generated activity entries for tasks.
/// Thread-safe via a dedicated lock object.
/// </summary>
public sealed class ActivityService : IActivityService
{
    private const string DateTimeFormat = "o";

    private readonly List<ActivityEntry> _entries = [];
    private readonly object _lock = new();
    private readonly ILogger<ActivityService> _logger;

    /// <summary>Initialises the service.</summary>
    /// <param name="logger">The logger instance.</param>
    public ActivityService(ILogger<ActivityService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<ActivityEntryDto>> GetActivityByTaskIdAsync(string taskId)
    {
        IReadOnlyList<ActivityEntryDto> result;
        lock (_lock)
        {
            result = _entries
                .Where(e => e.TaskId == taskId)
                .OrderBy(e => e.OccurredAt)
                .Select(MapToDto)
                .ToList()
                .AsReadOnly();
        }

        _logger.LogDebug("Retrieved {Count} activity entries for task {TaskId}.", result.Count, taskId);
        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public Task<ActivityEntryDto> RecordActivityAsync(string taskId, string description)
    {
        var entry = new ActivityEntry
        {
            Id = Guid.NewGuid().ToString(),
            TaskId = taskId,
            Description = description,
            OccurredAt = DateTime.UtcNow,
        };

        lock (_lock)
        {
            _entries.Add(entry);
        }

        _logger.LogInformation(
            "Activity recorded for task {TaskId}: {Description}.",
            taskId,
            description);

        return Task.FromResult(MapToDto(entry));
    }

    private static ActivityEntryDto MapToDto(ActivityEntry entry) => new()
    {
        Id = entry.Id,
        TaskId = entry.TaskId,
        Description = entry.Description,
        CreatedAt = entry.OccurredAt.ToString(DateTimeFormat),
    };
}
