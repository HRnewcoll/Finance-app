package service

import (
	"context"
	"fmt"
	"time"

	pb "{{MODULE_PATH}}/api"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// {{SERVICE_NAME_PASCAL}}Service implements the business logic for {{SERVICE_NAME}}.
type {{SERVICE_NAME_PASCAL}}Service struct {
	// TODO: Inject dependencies (e.g. repository, cache, message bus)
	// repo repository.{{SERVICE_NAME_PASCAL}}Repository
}

// New{{SERVICE_NAME_PASCAL}}Service creates a new service instance.
func New{{SERVICE_NAME_PASCAL}}Service() *{{SERVICE_NAME_PASCAL}}Service {
	return &{{SERVICE_NAME_PASCAL}}Service{}
}

// GetItem retrieves an item by ID.
func (s *{{SERVICE_NAME_PASCAL}}Service) GetItem(ctx context.Context, id string) (*pb.Item, error) {
	// TODO: implement with real repository call
	now := timestamppb.Now()
	return &pb.Item{
		Id:        id,
		Name:      fmt.Sprintf("item-%s", id),
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// ListItems retrieves a paginated list of items.
func (s *{{SERVICE_NAME_PASCAL}}Service) ListItems(ctx context.Context, page, pageSize int, filter string) ([]*pb.Item, int, error) {
	// TODO: implement with real repository call
	now := timestamppb.Now()
	items := []*pb.Item{
		{Id: "1", Name: "example-item-1", CreatedAt: now, UpdatedAt: now},
	}
	return items, len(items), nil
}

// CreateItem creates a new item.
func (s *{{SERVICE_NAME_PASCAL}}Service) CreateItem(ctx context.Context, name string) (*pb.Item, error) {
	// TODO: implement with real repository call
	now := timestamppb.Now()
	return &pb.Item{
		Id:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// UpdateItem updates an existing item and preserves the original CreatedAt timestamp.
func (s *{{SERVICE_NAME_PASCAL}}Service) UpdateItem(ctx context.Context, id, name string) (*pb.Item, error) {
	// TODO: Replace with real repository call that fetches the existing item first
	// to preserve the original CreatedAt timestamp.
	existing, err := s.GetItem(ctx, id)
	if err != nil {
		return nil, err
	}
	existing.Name = name
	existing.UpdatedAt = timestamppb.Now()
	return existing, nil
}

// DeleteItem deletes an item by ID.
func (s *{{SERVICE_NAME_PASCAL}}Service) DeleteItem(ctx context.Context, id string) error {
	// TODO: implement with real repository call
	return nil
}
