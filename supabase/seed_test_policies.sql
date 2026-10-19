-- Cross-User RLS Isolation Tests
-- Run this script in the Supabase SQL Editor to verify security policies and Row Level Security isolation.

DO $$
DECLARE
    user_a_id UUID := '11111111-1111-1111-1111-111111111111';
    user_b_id UUID := '22222222-2222-2222-2222-222222222222';
    test_task_id UUID;
    can_read_count INTEGER;
BEGIN
    RAISE NOTICE '=== Starting StudyPilot RLS Isolation Test ===';

    -- Clean up test records if any exist
    DELETE FROM public.tasks WHERE user_id IN (user_a_id, user_b_id);
    DELETE FROM public.profiles WHERE id IN (user_a_id, user_b_id);

    -- 1. Create mock profiles
    INSERT INTO public.profiles (id, display_name) VALUES (user_a_id, 'Student Alice');
    INSERT INTO public.profiles (id, display_name) VALUES (user_b_id, 'Student Bob');

    -- 2. Insert a private task for Alice
    INSERT INTO public.tasks (user_id, title, priority, total_units, completed_units, estimated_hours)
    VALUES (user_a_id, 'Alice Secret Research Thesis', 'High', 10, 2, 8.0)
    RETURNING id INTO test_task_id;

    -- 3. Simulate Bob's session (Setting auth.uid() to Bob)
    PERFORM set_config('request.jwt.claim.sub', user_b_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- Try to SELECT Alice's tasks as Bob
    SELECT COUNT(*) INTO can_read_count FROM public.tasks WHERE user_id = user_a_id;
    IF can_read_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILED: User B was able to see User A tasks!';
    ELSE
        RAISE NOTICE 'RLS PASSED: User B cannot view User A tasks (Count = 0).';
    END IF;

    -- Try to UPDATE Alice's tasks as Bob
    UPDATE public.tasks SET title = 'Hacked by Bob' WHERE id = test_task_id;
    IF FOUND THEN
        RAISE EXCEPTION 'RLS FAILED: User B was able to update User A task!';
    ELSE
        RAISE NOTICE 'RLS PASSED: User B cannot update User A task.';
    END IF;

    -- Try to DELETE Alice's tasks as Bob
    DELETE FROM public.tasks WHERE id = test_task_id;
    IF FOUND THEN
        RAISE EXCEPTION 'RLS FAILED: User B was able to delete User A task!';
    ELSE
        RAISE NOTICE 'RLS PASSED: User B cannot delete User A task.';
    END IF;

    -- Reset configuration
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', '', true);

    -- Clean up
    DELETE FROM public.tasks WHERE id = test_task_id;
    DELETE FROM public.profiles WHERE id IN (user_a_id, user_b_id);

    RAISE NOTICE '=== All RLS Isolation Checks Passed Successfully! ===';
END $$;
