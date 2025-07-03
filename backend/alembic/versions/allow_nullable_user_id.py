"""Allow nullable user_id in audit_logs for failed login attempts

Revision ID: allow_nullable_user_id
Revises: 
Create Date: 2025-07-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'allow_nullable_user_id'
down_revision = 'create_audit_logs'
depends_on = None


def upgrade():
    # Alterar a coluna user_id para permitir valores nulos
    op.alter_column('audit_logs', 'user_id',
                    existing_type=sa.Integer(),
                    nullable=True,
                    existing_nullable=False)


def downgrade():
    # Reverter a alteração - user_id volta a ser obrigatório
    op.alter_column('audit_logs', 'user_id',
                    existing_type=sa.Integer(),
                    nullable=False,
                    existing_nullable=True)
