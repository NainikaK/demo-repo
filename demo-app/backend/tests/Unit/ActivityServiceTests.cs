using DemoApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class ActivityServiceTests
{
    private readonly ActivityService _sut = new(NullLogger<ActivityService>.Instance);

    [Fact]
    public async Task RecordActivityAsync_ValidInput_ReturnsActivityEntryDtoWithMatchingFields()
    {
        var result = await _sut.RecordActivityAsync("task-1", "Task created");

        Assert.NotNull(result);
        Assert.Equal("task-1", result.TaskId);
        Assert.Equal("Task created", result.Description);
        Assert.False(string.IsNullOrWhiteSpace(result.Id));
        Assert.False(string.IsNullOrWhiteSpace(result.CreatedAt));
    }

    [Fact]
    public async Task RecordActivityAsync_CalledMultipleTimes_EachEntryHasUniqueId()
    {
        var first = await _sut.RecordActivityAsync("task-1", "Task created");
        var second = await _sut.RecordActivityAsync("task-1", "Comment added");

        Assert.NotEqual(first.Id, second.Id);
    }

    [Fact]
    public async Task GetActivityByTaskIdAsync_NoEntriesForTask_ReturnsEmptyList()
    {
        var result = await _sut.GetActivityByTaskIdAsync("nonexistent-task");

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetActivityByTaskIdAsync_AfterRecording_ReturnsEntryInChronologicalOrder()
    {
        await _sut.RecordActivityAsync("task-42", "Task created");
        await _sut.RecordActivityAsync("task-42", "Comment added");

        var result = await _sut.GetActivityByTaskIdAsync("task-42");

        Assert.Equal(2, result.Count);
        Assert.Equal("Task created", result[0].Description);
        Assert.Equal("Comment added", result[1].Description);
    }
}
