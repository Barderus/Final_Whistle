revoke all on function public.get_server_time() from public;
revoke all on function public.get_server_time() from anon;
grant execute on function public.get_server_time() to authenticated;
