# Migration versions

Empty until the recog-db team's schema is approved. The first migration will be
generated with:

```
alembic revision --autogenerate -m "create core schema"
alembic upgrade head
```

All schema mutations go through this folder — never edit tables by hand.
