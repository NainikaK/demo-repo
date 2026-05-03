using DemoApp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DemoApp.Tests.Unit;

public sealed class ActivityServiceTests
{
    private ActivityService CreateSut() => new(NullLogger<ActivityService>.Instance);

    // GetActivityByTaskIdAsync

    [Fact]
    public async Task GetActivityByTaskIdAsync_NoEntries_ReturnsEmptyList()
    {
        var sut = CreateSut();

        var result = await sut.GetActivityByTaskIdAsync("task-1");

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetActivityByTaskIdAsync_UnknownTask_ReturnsEmptyList()
    {
        var sut = CreateSut();
        await sut.RecordActivityAsync("task-other", "Task created");

        var result = await sut.GetActivityByTaskIdAsync("task-unknown");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetActivityByTaskIdAsync_AfterRecordingEntry_ReturnsEntry()
    {
        var sut = CreateSut();
        await sut.RecordActivityAsync("task-1", "Task created");

        var result = await sut.GetActivityByTaskIdAsync("task-1");

        Assert.Single(result);
        Assert.Equal("Task created", result[0].Description);
        Assert.Equal("task-1", result[0].TaskId);
    }

    [Fact]
    public async Task GetActivityByTaskIdAsync_OnlyReturnsEntriesForRequestedTask()
    {
        var sut = CreateSut();
        await sut.RecordActivityAsync("task-1", "Task created");
        await sut.RecordActivityAsync("task-2", "Task created");

        var result = await sut.GetActivityByTaskIdAsync("task-1");

        Assert.Single(result);
        Assert.Equal("task-1", result[0].TaskId);
    }

    [Fact]
    public async Task GetActivityByTaskIdAsync_MultipleEntries_ReturnsInChronologicalOrder()
    {
        var sut = CreateSut();
        await sut.RecordActivityAsync("task-1", "Task created");
        await sut.RecordActivityAsync("task-1", "Comment added");
        await sut.RecordActivityAsync("task-1", "Task marked complete");

        var result = await sut.GetActivityByTaskIdAsync("task-1");

        Assert.Equal(3, result.Count);
        Assert.Equal("Task created", result[0].Description);
        Assert.Equal("Comment added", result[1].Description);
        Assert.Equal("Task marked complete", result[2].Description);
    }

    // RecordActivityAsync

    [Fact]
    public async Task RecordActivityAsync_ValidInput_ReturnsCreatedDto()
    {
        var sut = CreateSut();

        var result = await sut.RecordActivityAsync("task-1", "Task created");

        Assert.NotNull(result);
        Assert.Equal("task-1", result.TaskId);
        Assert.Equal("Task created", result.Description);
        Assert.False(string.IsNullOrEmpty(result.Id));
    }

    [Fact]
    public async Task RecordActivityAsync_ValidInput_CreatedAtIsNonEmpty()
    {
        var sut = CreateSut();

        var result = await sut.RecordActivityAsync("task-1", "Task created");

        Assert.False(string.IsNullOrEmpty(result.CreatedAt));
    }

    [Fact]
    public async Task RecordActivityAsync_TwoEntries_AssignsUniqueIds()
    {
        var sut = CreateSut();

        var first = await sut.RecordActivityAsync("task-1", "Task created");
        var second = await sut.RecordActivityAsync("task-1", "Comment added");

        Assert.NotEqual(first.Id, second.Id);
    }

    [Fact]
    public async Task RecordActivityAsync_PersistsEntry_VisibleViaGetActivity()
    {
        var sut = CreateSut();

        await sut.RecordActivityAsync("task-1", "Task marked complete");
        var entries = await sut.GetActivityByTaskIdAsync("task-1");

        Assert.Single(entries);
        Assert.Equal("Task marked complete", entries[0].Description);
    }
}
